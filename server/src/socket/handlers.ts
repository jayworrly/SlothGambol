import { Server, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  TableConfig,
  ActionType
} from '../types/poker.js';
import { GameRoom } from '../game/GameRoom.js';

type PokerServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type PokerSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

// In-memory storage (replace with Redis in production)
const gameRooms = new Map<string, GameRoom>();
const playerToRoom = new Map<string, string>();

// Default tables for testing
const defaultTables: TableConfig[] = [
  {
    id: 'table-1',
    name: 'Beginner Table',
    variant: 'texas-holdem',
    maxPlayers: 9,
    minPlayers: 2,
    smallBlind: 1n,
    bigBlind: 2n,
    minBuyIn: 40n,
    maxBuyIn: 200n,
    timeBank: 30,
    isPrivate: false
  },
  {
    id: 'table-2',
    name: 'Mid Stakes',
    variant: 'texas-holdem',
    maxPlayers: 6,
    minPlayers: 2,
    smallBlind: 5n,
    bigBlind: 10n,
    minBuyIn: 200n,
    maxBuyIn: 1000n,
    timeBank: 30,
    isPrivate: false
  },
  {
    id: 'table-3',
    name: 'High Roller',
    variant: 'texas-holdem',
    maxPlayers: 6,
    minPlayers: 2,
    smallBlind: 25n,
    bigBlind: 50n,
    minBuyIn: 1000n,
    maxBuyIn: 5000n,
    timeBank: 45,
    isPrivate: false
  }
];

export function initializeDefaultTables(io: PokerServer): void {
  for (const config of defaultTables) {
    const room = new GameRoom(io, config);
    gameRooms.set(config.id, room);
    console.log(`Created table: ${config.name} (${config.id})`);
  }
}

export function registerHandlers(io: PokerServer, socket: PokerSocket): void {
  console.log(`Client connected: ${socket.id}`);

  // Handle table join
  socket.on('table:join', (data, callback) => {
    try {
      const { tableId, seatNumber, buyIn } = data;
      const buyInBigInt = BigInt(buyIn);

      // Get wallet address from auth (mock for now)
      const walletAddress = socket.handshake.auth.walletAddress || `0x${socket.id.slice(0, 40)}`;
      const username = socket.handshake.auth.username || `Player_${socket.id.slice(0, 6)}`;

      // Find the game room
      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      // Check if player is already at another table
      if (socket.data.tableId && socket.data.tableId !== tableId) {
        callback({ success: false, error: 'Already seated at another table' });
        return;
      }

      // Check if this wallet already has a player at this table (reconnection)
      const existingPlayer = room.findPlayerByWallet(walletAddress);
      if (existingPlayer) {
        // Attempt to reconnect
        const reconnected = room.handlePlayerReconnect(existingPlayer.id, socket);
        if (reconnected) {
          playerToRoom.set(existingPlayer.id, tableId);
          callback({
            success: true,
            player: {
              id: existingPlayer.id,
              walletAddress: existingPlayer.walletAddress,
              username: existingPlayer.username,
              seatNumber: existingPlayer.seatNumber,
              chips: existingPlayer.chips.toString(),
              bet: existingPlayer.bet.toString(),
              isActive: existingPlayer.isActive,
              isFolded: existingPlayer.isFolded,
              isAllIn: existingPlayer.isAllIn,
              isDealer: existingPlayer.isDealer,
              isSmallBlind: existingPlayer.isSmallBlind,
              isBigBlind: existingPlayer.isBigBlind,
              lastAction: existingPlayer.lastAction ? {
                type: existingPlayer.lastAction.type,
                amount: existingPlayer.lastAction.amount.toString(),
                timestamp: existingPlayer.lastAction.timestamp
              } : null,
              hasCards: existingPlayer.cards.length > 0
            },
            gameState: room.serializeState()
          });
          console.log(`Player ${username} reconnected to table ${tableId}`);
          return;
        }
      }

      // Add player to room
      const player = room.addPlayer(socket, walletAddress, username, seatNumber, buyInBigInt);
      if (!player) {
        callback({ success: false, error: 'Could not join table - seat may be taken' });
        return;
      }

      playerToRoom.set(player.id, tableId);

      callback({
        success: true,
        player: {
          id: player.id,
          walletAddress: player.walletAddress,
          username: player.username,
          seatNumber: player.seatNumber,
          chips: player.chips.toString(),
          bet: player.bet.toString(),
          isActive: player.isActive,
          isFolded: player.isFolded,
          isAllIn: player.isAllIn,
          isDealer: player.isDealer,
          isSmallBlind: player.isSmallBlind,
          isBigBlind: player.isBigBlind,
          lastAction: null,
          hasCards: false
        },
        gameState: room.serializeState()
      });

      console.log(`Player ${username} joined table ${tableId} at seat ${seatNumber}`);
    } catch (error) {
      console.error('Error joining table:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle table leave
  socket.on('table:leave', (callback) => {
    try {
      const { tableId, playerId } = socket.data;

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      const removed = room.removePlayer(playerId);
      if (removed) {
        playerToRoom.delete(playerId);
        socket.data.tableId = null;
        socket.data.playerId = '';
        callback({ success: true });
        console.log(`Player ${playerId} left table ${tableId}`);
      } else {
        callback({ success: false, error: 'Could not leave table' });
      }
    } catch (error) {
      console.error('Error leaving table:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle game actions
  socket.on('game:action', (data, callback) => {
    try {
      const { action, amount } = data;
      const { tableId, playerId } = socket.data;

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      const amountBigInt = amount ? BigInt(amount) : 0n;
      const success = room.handleAction(playerId, action as ActionType, amountBigInt);

      if (success) {
        const state = room.serializeState();
        const player = state.players.find(p => p.id === playerId);
        callback({
          success: true,
          newChips: player?.chips,
          pot: state.pot
        });
      } else {
        callback({ success: false, error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error processing action:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle sit out
  socket.on('table:sit-out', (callback) => {
    // TODO: Implement sit-out logic
    callback({ success: false, error: 'Not implemented' });
  });

  // Handle sit in
  socket.on('table:sit-in', (callback) => {
    // TODO: Implement sit-in logic
    callback({ success: false, error: 'Not implemented' });
  });

  // Handle add chips
  socket.on('table:add-chips', (_data, callback) => {
    // TODO: Implement add chips logic (requires blockchain integration)
    callback({ success: false, error: 'Not implemented' });
  });

  // Handle show cards
  socket.on('game:show-cards', (callback) => {
    // TODO: Implement show cards logic
    callback({ success: false, error: 'Not implemented' });
  });

  // Mental poker handlers
  socket.on('mental-poker:commit', (data, callback) => {
    try {
      const { commitment } = data;
      const { tableId, playerId } = socket.data;

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      const success = room.receiveMentalPokerCommitment(playerId, commitment);
      callback({ success, error: success ? undefined : 'Failed to submit commitment' });
    } catch (error) {
      console.error('Error processing commitment:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  socket.on('mental-poker:shuffle', (data, callback) => {
    try {
      const { encryptedDeck } = data;
      const { tableId, playerId } = socket.data;

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      const success = room.receiveMentalPokerShuffle(playerId, encryptedDeck);
      callback({ success, error: success ? undefined : 'Failed to submit shuffle' });
    } catch (error) {
      console.error('Error processing shuffle:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  socket.on('mental-poker:reveal-key', (data, callback) => {
    try {
      const { cardPosition, decryptionKey, commitment, salt } = data;
      const { tableId, playerId } = socket.data;

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      const success = room.receiveMentalPokerKeyReveal(playerId, {
        cardPosition,
        decryptionKey,
        commitment,
        salt
      });
      callback({ success, error: success ? undefined : 'Failed to submit key reveal' });
    } catch (error) {
      console.error('Error processing key reveal:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle chat
  socket.on('chat:send', (data, callback) => {
    try {
      const { message } = data;
      const { tableId, playerId } = socket.data;

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      // Sanitize and broadcast message
      const sanitizedMessage = message.slice(0, 200).trim();
      if (sanitizedMessage) {
        io.to(tableId).emit('table:chat', {
          playerId,
          message: sanitizedMessage,
          timestamp: Date.now()
        });
        callback({ success: true });
      } else {
        callback({ success: false, error: 'Invalid message' });
      }
    } catch (error) {
      console.error('Error sending chat:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    const { tableId, playerId } = socket.data;
    if (tableId && playerId) {
      const room = gameRooms.get(tableId);
      if (room) {
        room.handlePlayerDisconnect(playerId);
        // Don't remove player immediately - allow reconnection
        // After timeout, removePlayer will be called
      }
    }
  });
}

// API helpers for REST endpoints
export function getTableList(): Array<{ id: string; name: string; players: number; maxPlayers: number; smallBlind: string; bigBlind: string }> {
  return Array.from(gameRooms.entries()).map(([id, room]) => {
    const state = room.getState();
    return {
      id,
      name: state.config.name,
      players: room.getPlayerCount(),
      maxPlayers: state.config.maxPlayers,
      smallBlind: state.config.smallBlind.toString(),
      bigBlind: state.config.bigBlind.toString()
    };
  });
}

export function createTable(io: PokerServer, config: TableConfig): GameRoom {
  const room = new GameRoom(io, config);
  gameRooms.set(config.id, room);
  return room;
}

export function getRoom(tableId: string): GameRoom | undefined {
  return gameRooms.get(tableId);
}
