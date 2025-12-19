import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  TableConfig,
  ActionType
} from '../types/poker.js';
import { GameRoom } from '../game/GameRoom.js';
import { chipVault } from '../blockchain/chipVault.js';
import { db } from '../database/supabase.js';

type PokerServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type PokerSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

// In-memory storage (replace with Redis in production)
const gameRooms = new Map<string, GameRoom>();
const playerToRoom = new Map<string, string>();
// Track sockets by wallet address to prevent duplicates
const walletToSocket = new Map<string, PokerSocket>();

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
  const walletAddress = socket.handshake.auth.walletAddress || 'unknown';
  console.log(`Client connected: ${socket.id}, wallet: ${walletAddress?.slice(0, 10)}`);

  // Prevent duplicate connections from the same wallet
  if (walletAddress !== 'unknown') {
    const existingSocket = walletToSocket.get(walletAddress.toLowerCase());
    if (existingSocket && existingSocket.id !== socket.id) {
      console.log(`[Duplicate] Disconnecting old socket ${existingSocket.id} for wallet ${walletAddress.slice(0, 10)}`);
      existingSocket.disconnect(true);
    }
    walletToSocket.set(walletAddress.toLowerCase(), socket);
  }

  // Handle table join
  socket.on('table:join', async (data, callback) => {
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

      // Lock chips on blockchain if available
      if (chipVault.canWrite()) {
        const lockResult = await chipVault.lockChips(
          walletAddress as `0x${string}`,
          buyInBigInt,
          tableId
        );
        if (!lockResult.success) {
          callback({ success: false, error: `Failed to lock chips: ${lockResult.error}` });
          return;
        }
        console.log(`Blockchain: Locked ${buyIn} chips for ${walletAddress} at ${tableId}`);
      }

      // Get or create user in database
      const dbUser = await db.getOrCreateUser(walletAddress);

      // Create session in database
      let sessionId: string | null = null;
      if (dbUser) {
        sessionId = await db.createSession({
          user_id: dbUser.id,
          table_id: tableId,
          seat_number: seatNumber,
          buy_in_amount: buyIn,
        });
      }

      // Add player to room
      const player = room.addPlayer(socket, walletAddress, username, seatNumber, buyInBigInt);
      if (!player) {
        // Rollback blockchain lock if room join failed
        if (chipVault.canWrite()) {
          await chipVault.unlockChips(walletAddress as `0x${string}`, buyInBigInt, tableId);
        }
        callback({ success: false, error: 'Could not join table - seat may be taken' });
        return;
      }

      // Store session ID on socket for later use
      socket.data.sessionId = sessionId || undefined;

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
  socket.on('table:leave', async (callback) => {
    try {
      const { tableId, playerId, sessionId } = socket.data;

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      // Get player info before removal for blockchain/db operations
      const state = room.getState();
      const player = state.players.get(playerId);
      const walletAddress = player?.walletAddress;
      const finalChips = player?.chips || 0n;
      const handsPlayed = state.handNumber;

      const removed = room.removePlayer(playerId);
      if (removed) {
        // Unlock chips on blockchain
        if (chipVault.canWrite() && walletAddress && finalChips > 0n) {
          const unlockResult = await chipVault.unlockChips(
            walletAddress as `0x${string}`,
            finalChips,
            tableId
          );
          if (unlockResult.success) {
            console.log(`Blockchain: Unlocked ${finalChips} chips for ${walletAddress} from ${tableId}`);
          } else {
            console.error(`Failed to unlock chips: ${unlockResult.error}`);
          }
        }

        // End session in database
        if (sessionId) {
          await db.endSession(sessionId, finalChips.toString(), handsPlayed);
        }

        playerToRoom.delete(playerId);
        socket.data.tableId = null;
        socket.data.playerId = '';
        socket.data.sessionId = undefined;
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

      const success = room.setPlayerSitOut(playerId, true);
      if (success) {
        callback({ success: true });
        console.log(`Player ${playerId} is now sitting out at table ${tableId}`);
      } else {
        callback({ success: false, error: 'Could not sit out' });
      }
    } catch (error) {
      console.error('Error sitting out:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle sit in
  socket.on('table:sit-in', (callback) => {
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

      const success = room.setPlayerSitOut(playerId, false);
      if (success) {
        callback({ success: true });
        console.log(`Player ${playerId} is back in at table ${tableId}`);
      } else {
        callback({ success: false, error: 'Could not sit in' });
      }
    } catch (error) {
      console.error('Error sitting in:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle add chips (rebuy)
  socket.on('table:add-chips', async (data, callback) => {
    try {
      const { amount } = data;
      const { tableId, playerId } = socket.data;
      const amountBigInt = BigInt(amount);

      if (!tableId || !playerId) {
        callback({ success: false, error: 'Not seated at a table' });
        return;
      }

      const room = gameRooms.get(tableId);
      if (!room) {
        callback({ success: false, error: 'Table not found' });
        return;
      }

      const state = room.getState();
      const player = state.players.get(playerId);
      if (!player) {
        callback({ success: false, error: 'Player not found' });
        return;
      }

      // Lock additional chips on blockchain if available
      if (chipVault.canWrite()) {
        const lockResult = await chipVault.lockChips(
          player.walletAddress as `0x${string}`,
          amountBigInt,
          tableId
        );
        if (!lockResult.success) {
          callback({ success: false, error: `Failed to lock chips: ${lockResult.error}` });
          return;
        }
        console.log(`Blockchain: Locked additional ${amount} chips for ${player.walletAddress}`);
      }

      // Add chips to player
      const success = room.addChipsToPlayer(playerId, amountBigInt);
      if (success) {
        callback({ success: true });
        console.log(`Player ${playerId} added ${amount} chips at table ${tableId}`);
      } else {
        // Rollback blockchain lock if room operation failed
        if (chipVault.canWrite()) {
          await chipVault.unlockChips(player.walletAddress as `0x${string}`, amountBigInt, tableId);
        }
        callback({ success: false, error: 'Could not add chips - check table limits' });
      }
    } catch (error) {
      console.error('Error adding chips:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle show cards
  socket.on('game:show-cards', (callback) => {
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

      const success = room.showPlayerCards(playerId);
      if (success) {
        callback({ success: true });
        console.log(`Player ${playerId} showed cards at table ${tableId}`);
      } else {
        callback({ success: false, error: 'Cannot show cards at this time' });
      }
    } catch (error) {
      console.error('Error showing cards:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  });

  // Handle table creation
  socket.on('table:create', async (data, callback) => {
    try {
      const { name, variant, smallBlind, bigBlind, minBuyIn, maxBuyIn, maxPlayers, timeBank, isPrivate } = data;

      const tableId = `table-${uuidv4().slice(0, 8)}`;
      const config: TableConfig = {
        id: tableId,
        name: name || `Table ${tableId}`,
        variant: variant || 'texas-holdem',
        maxPlayers: maxPlayers || 9,
        minPlayers: 2,
        smallBlind: BigInt(smallBlind || '1'),
        bigBlind: BigInt(bigBlind || '2'),
        minBuyIn: BigInt(minBuyIn || '40'),
        maxBuyIn: BigInt(maxBuyIn || '200'),
        timeBank: timeBank || 30,
        isPrivate: isPrivate || false,
      };

      createTable(io, config);
      console.log(`Created new table: ${config.name} (${tableId})`);

      callback({
        success: true,
        tableId,
        config: {
          ...config,
          smallBlind: config.smallBlind.toString(),
          bigBlind: config.bigBlind.toString(),
          minBuyIn: config.minBuyIn.toString(),
          maxBuyIn: config.maxBuyIn.toString(),
        },
      });
    } catch (error) {
      console.error('Error creating table:', error);
      callback({ success: false, error: 'Internal server error' });
    }
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
    console.log(`Client disconnected: ${socket.id}, wallet: ${walletAddress?.slice(0, 10)}`);

    // Clean up wallet tracking - only if this is the current socket for the wallet
    if (walletAddress !== 'unknown') {
      const currentSocket = walletToSocket.get(walletAddress.toLowerCase());
      if (currentSocket?.id === socket.id) {
        walletToSocket.delete(walletAddress.toLowerCase());
        console.log(`[Cleanup] Removed wallet ${walletAddress.slice(0, 10)} from tracking`);
      }
    }

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
