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

// Load environment variables from .env file (only in development)
// Railway injects env vars directly, so we use override: false to not overwrite them
config({ override: false });

// Initialize database
db.initialize();

const PORT = process.env.PORT || 3001;

// Use production URL if NODE_ENV is production, otherwise use env var or localhost
const CORS_ORIGIN = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || 'https://slothgambol.xyz')
  : (process.env.CORS_ORIGIN || 'http://localhost:3000');

console.log('CORS Origin:', CORS_ORIGIN);

// Create HTTP server
const httpServer = createServer((req, res) => {
  // Simple REST API for table list
  if (req.method === 'GET' && req.url === '/api/tables') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify({ tables: getTableList() }));
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
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
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
httpServer.listen(PORT, () => {
  const dbStatus = db.isConnected() ? '✅ Connected' : '⚠️  Not configured';
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎰  Avalanche Poker WebSocket Server                  ║
║                                                           ║
║     HTTP Server:  http://localhost:${PORT}                  ║
║     WebSocket:    ws://localhost:${PORT}                    ║
║     CORS Origin:  ${CORS_ORIGIN.padEnd(25)}           ║
║     Database:     ${dbStatus.padEnd(25)}           ║
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
