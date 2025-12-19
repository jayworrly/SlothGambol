import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from 'dotenv';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
} from './types/poker.js';
import { registerHandlers, initializeDefaultTables, getTableList } from './socket/handlers.js';
import { db } from './database/supabase.js';
import { chipVault } from './blockchain/chipVault.js';

// Load environment variables from .env file (only in development)
// Railway injects env vars directly, so we use override: false to not overwrite them
config({ override: false });

// Initialize database
db.initialize();

// Initialize blockchain service
chipVault.initialize();

const PORT = process.env.PORT || 3001;

// Use production URL if NODE_ENV is production, otherwise use env var or localhost
const CORS_ORIGIN = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || 'https://slothgambol.xyz')
  : (process.env.CORS_ORIGIN || 'http://localhost:3000');

console.log('CORS Origin:', CORS_ORIGIN);

// Create HTTP server
const httpServer = createServer((req, res) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Simple REST API for table list
  if (req.method === 'GET' && req.url === '/api/tables') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ tables: getTableList() }));
    return;
  }

  // Create table endpoint
  if (req.method === 'POST' && req.url === '/api/tables/create') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { v4: uuidv4 } = require('uuid');
        const tableId = `table-${uuidv4().slice(0, 8)}`;

        const config = {
          id: tableId,
          name: data.name || `Table ${tableId}`,
          variant: data.variant || 'texas-holdem',
          maxPlayers: data.maxPlayers || 9,
          minPlayers: 2,
          smallBlind: BigInt(data.smallBlind || '1'),
          bigBlind: BigInt(data.bigBlind || '2'),
          minBuyIn: BigInt(data.minBuyIn || '40'),
          maxBuyIn: BigInt(data.maxBuyIn || '200'),
          timeBank: data.timeBank || 30,
          isPrivate: data.isPrivate || false,
        };

        const { createTable } = require('./socket/handlers.js');
        createTable(io, config);

        console.log(`Created new table via REST: ${config.name} (${tableId})`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          tableId,
          config: {
            ...config,
            smallBlind: config.smallBlind.toString(),
            bigBlind: config.bigBlind.toString(),
            minBuyIn: config.minBuyIn.toString(),
            maxBuyIn: config.maxBuyIn.toString(),
          }
        }));
      } catch (error) {
        console.error('Error creating table:', error);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create Socket.IO server
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  }
);

// Initialize default tables
initializeDefaultTables(io);

// Handle new connections
io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  io.close(() => {
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  io.close(() => {
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

// Start server
httpServer.listen(PORT, async () => {
  const dbStatus = db.isConnected() ? '✅ Connected' : '⚠️  Not configured';
  const blockchainStatus = chipVault.isInitialized()
    ? chipVault.canWrite()
      ? '✅ Read/Write'
      : '⚠️  Read-only'
    : '❌ Not configured';

  // Check server authorization if blockchain is ready
  let authStatus = '';
  if (chipVault.canWrite()) {
    const isAuthorized = await chipVault.isServerAuthorized();
    authStatus = isAuthorized ? '✅ Authorized' : '⚠️  Not authorized';
  }

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎰  Avalanche Poker WebSocket Server                  ║
║                                                           ║
║     HTTP Server:  http://localhost:${PORT}                  ║
║     WebSocket:    ws://localhost:${PORT}                    ║
║     CORS Origin:  ${CORS_ORIGIN.padEnd(25)}           ║
║     Database:     ${dbStatus.padEnd(25)}           ║
║     Blockchain:   ${blockchainStatus.padEnd(25)}           ║${authStatus ? `
║     Server Auth:  ${authStatus.padEnd(25)}           ║` : ''}
║                                                           ║
║     Endpoints:                                            ║
║       GET /health      - Health check                     ║
║       GET /api/tables  - List all tables                  ║
║       WS  /            - Socket.io connection             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { io, httpServer };
