"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAccount } from "wagmi";
import { useGameStore } from "@/stores/gameStore";

// Server event types (matching poker-server)
interface SerializedCard {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
}

interface SerializedPlayer {
  id: string;
  walletAddress: string;
  username: string;
  seatNumber: number;
  chips: string;
  bet: string;
  isActive: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction: {
    type: string;
    amount: string;
    timestamp: number;
  } | null;
  hasCards: boolean;
}

interface SerializedGameState {
  tableId: string;
  config: {
    id: string;
    name: string;
    variant: string;
    maxPlayers: number;
    minPlayers: number;
    smallBlind: string;
    bigBlind: string;
    minBuyIn: string;
    maxBuyIn: string;
    timeBank: number;
    isPrivate: boolean;
  };
  phase: string;
  players: SerializedPlayer[];
  communityCards: SerializedCard[];
  pot: string;
  sidePots: { amount: string; eligiblePlayers: string[] }[];
  currentBet: string;
  dealerSeat: number;
  currentPlayerSeat: number;
  handNumber: number;
  turnStartTime: number;
}

interface ServerToClientEvents {
  // Game state updates
  "game:state": (state: SerializedGameState) => void;
  "game:started": (data: { handNumber: number }) => void;
  "game:phase-change": (data: {
    phase: string;
    communityCards: SerializedCard[];
  }) => void;
  "game:player-action": (data: {
    playerId: string;
    action: { type: string; amount: string; timestamp: number };
  }) => void;
  "game:turn": (data: {
    playerId: string;
    seatNumber: number;
    timeRemaining: number;
    availableActions: string[];
  }) => void;
  "game:hand-result": (result: {
    winners: {
      playerId: string;
      amount: string;
      hand: { rank: string; description: string };
    }[];
    pots: { amount: string; winners: string[]; type: string }[];
  }) => void;

  // Player updates
  "player:joined": (player: SerializedPlayer) => void;
  "player:left": (data: { playerId: string; seatNumber: number }) => void;
  "player:cards": (cards: SerializedCard[]) => void;
  "player:chips-update": (data: { playerId: string; chips: string }) => void;

  // Table updates
  "table:pot-update": (data: {
    pot: string;
    sidePots: { amount: string; eligiblePlayers: string[] }[];
  }) => void;
  "table:chat": (data: {
    playerId: string;
    message: string;
    timestamp: number;
  }) => void;

  // Mental Poker events
  "mental-poker:phase": (data: {
    phase: string;
    currentShuffler?: string;
  }) => void;
  "mental-poker:commitment-received": (data: {
    playerId: string;
    commitmentsReceived: number;
    totalPlayers: number;
  }) => void;
  "mental-poker:shuffle-turn": (data: {
    playerId: string;
    encryptedDeck: string[];
  }) => void;
  "mental-poker:shuffle-complete": (data: {
    encryptedDeck: string[];
  }) => void;
  "mental-poker:request-key": (data: {
    cardPosition: number;
    cardType: "hole" | "community";
    recipientId?: string;
  }) => void;
  "mental-poker:key-revealed": (data: {
    playerId: string;
    cardPosition: number;
    complete: boolean;
    playersNeeded: string[];
  }) => void;
  "mental-poker:card-revealed": (data: {
    cardPosition: number;
    cardType: "hole" | "community";
    recipientId?: string;
  }) => void;

  // System events
  error: (data: { code: string; message: string }) => void;
  notification: (data: {
    type: "info" | "warning" | "success";
    message: string;
  }) => void;
}

interface ClientToServerEvents {
  // Table actions
  "table:join": (
    data: { tableId: string; seatNumber: number; buyIn: string },
    callback: (response: {
      success: boolean;
      error?: string;
      player?: SerializedPlayer;
      gameState?: SerializedGameState;
    }) => void
  ) => void;
  "table:leave": (
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  "table:sit-out": (
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  "table:sit-in": (
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  "table:add-chips": (
    data: { amount: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  // Game actions
  "game:action": (
    data: { action: string; amount?: string },
    callback: (response: {
      success: boolean;
      error?: string;
      newChips?: string;
      pot?: string;
    }) => void
  ) => void;
  "game:show-cards": (
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  // Mental poker
  "mental-poker:commit": (
    data: { commitment: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  "mental-poker:shuffle": (
    data: { encryptedDeck: string[] },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  "mental-poker:reveal-key": (
    data: {
      cardPosition: number;
      decryptionKey: string;
      commitment: string;
      salt: string;
    },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  // Chat
  "chat:send": (
    data: { message: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface WebSocketContextValue {
  socket: TypedSocket | null;
  isConnected: boolean;
  playerId: string | null;
  joinTable: (
    tableId: string,
    seatNumber: number,
    buyIn: string
  ) => Promise<{ success: boolean; error?: string }>;
  leaveTable: () => Promise<{ success: boolean; error?: string }>;
  sendAction: (
    action: string,
    amount?: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendChat: (message: string) => void;
  // Mental Poker
  sendCommitment: (commitment: string) => Promise<{ success: boolean; error?: string }>;
  sendShuffle: (encryptedDeck: string[]) => Promise<{ success: boolean; error?: string }>;
  sendKeyReveal: (data: {
    cardPosition: number;
    decryptionKey: string;
    commitment: string;
    salt: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const playerIdRef = useRef<string | null>(null); // Ref to avoid reconnection loops
  const lastAddressRef = useRef<string | null>(null); // Track last connected address
  const { address, isConnected: isWalletConnected } = useAccount();
  const gameStore = useGameStore();

  // Keep ref in sync with state
  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  // Initialize socket connection
  useEffect(() => {
    console.log('[WebSocket] Effect running - v4', { isWalletConnected, address: address?.slice(0, 10), lastAddress: lastAddressRef.current?.slice(0, 10) }); // Version marker

    if (!isWalletConnected || !address) {
      console.log('[WebSocket] No wallet connected, cleaning up');
      if (socketRef.current) {
        console.log('[WebSocket] Disconnecting existing socket due to wallet disconnect');
        socketRef.current.disconnect();
        socketRef.current = null;
        lastAddressRef.current = null;
        setIsConnected(false);
        setPlayerId(null);
        gameStore.setConnected(false);
      }
      return;
    }

    // Check if we already have a connection for this address
    const sameAddress = lastAddressRef.current === address;
    const hasActiveSocket = socketRef.current && (socketRef.current.connected || socketRef.current.active);

    if (sameAddress && hasActiveSocket) {
      console.log('[WebSocket] Already connected with same address, skipping');
      return;
    }

    // If address changed, disconnect old socket first
    if (socketRef.current && !sameAddress) {
      console.log('[WebSocket] Address changed, disconnecting old socket');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    console.log('[WebSocket] Creating new connection to', wsUrl);

    socketRef.current = io(wsUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket'], // Force WebSocket, skip polling
      auth: {
        walletAddress: address,
        username: `Player_${address.slice(2, 8)}`,
      },
    });

    const socket = socketRef.current;

    // Track which address we're connected with
    lastAddressRef.current = address;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected, id:", socket.id, "address:", address?.slice(0, 10));
      setIsConnected(true);
      gameStore.setConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected, reason:", reason);
      setIsConnected(false);
      gameStore.setConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error.message);
    });

    socket.on("error", (data) => {
      console.error("WebSocket error:", data.message);
    });

    socket.on("notification", (data) => {
      console.log(`[${data.type}] ${data.message}`);
    });

    // Game state handlers
    socket.on("game:state", (state) => {
      console.log("[WebSocket] game:state received:", { phase: state.phase, currentPlayerSeat: state.currentPlayerSeat, handNumber: state.handNumber });
      gameStore.setPhase(state.phase as Parameters<typeof gameStore.setPhase>[0]);
      gameStore.setPot(BigInt(state.pot));
      gameStore.setCurrentBet(BigInt(state.currentBet));
      gameStore.setCommunityCards(state.communityCards);

      // Set current actor from server state
      if (state.currentPlayerSeat !== undefined && state.currentPlayerSeat >= 0) {
        gameStore.setCurrentActor(state.currentPlayerSeat);
      }

      // Set hand number
      if (state.handNumber) {
        gameStore.setHandNumber(state.handNumber);
      }

      // Update players
      for (const player of state.players) {
        gameStore.addOrUpdatePlayer(player.seatNumber, {
          walletAddress: player.walletAddress,
          username: player.username,
          stack: BigInt(player.chips),
          currentBet: BigInt(player.bet),
          isFolded: player.isFolded,
          isAllIn: player.isAllIn,
          isDealer: player.isDealer,
          isActive: !player.isFolded && player.isActive,
        });
      }
    });

    socket.on("game:started", (data) => {
      console.log("[WebSocket] game:started received - Hand #" + data.handNumber);
      gameStore.setPhase("preflop");
      gameStore.setHandNumber(data.handNumber);
    });

    socket.on("game:phase-change", (data) => {
      gameStore.setPhase(data.phase as Parameters<typeof gameStore.setPhase>[0]);
      gameStore.setCommunityCards(data.communityCards);
    });

    socket.on("player:cards", (cards) => {
      gameStore.setMyHoleCards(cards);
    });

    socket.on("game:turn", (data) => {
      console.log("[WebSocket] game:turn received:", {
        playerId: data.playerId,
        seatNumber: data.seatNumber,
        myPosition: useGameStore.getState().myPosition,
        availableActions: data.availableActions
      });
      // Set whose turn it is
      gameStore.setCurrentActor(data.seatNumber);
      gameStore.setActionDeadline(Date.now() + data.timeRemaining * 1000);
      // Map server action types to store action types
      const actionTypeMap: Record<string, "fold" | "check" | "call" | "bet" | "raise" | "all_in"> = {
        "fold": "fold",
        "check": "check",
        "call": "call",
        "bet": "bet",
        "raise": "raise",
        "all-in": "all_in",
      };
      const actions = data.availableActions.map((type) => ({
        type: actionTypeMap[type] || "fold",
        minAmount: 0n,
        maxAmount: 0n,
      }));
      gameStore.setAvailableActions(actions);
    });

    socket.on("game:player-action", (data) => {
      console.log(`Player ${data.playerId}: ${data.action.type} ${data.action.amount}`);
    });

    socket.on("game:hand-result", (result) => {
      console.log("[WebSocket] game:hand-result received:", result);
      gameStore.setPhase("showdown");
    });

    socket.on("player:joined", (player) => {
      console.log(`Player ${player.username} joined at seat ${player.seatNumber}`);
      gameStore.addOrUpdatePlayer(player.seatNumber, {
        walletAddress: player.walletAddress,
        username: player.username,
        stack: BigInt(player.chips),
        currentBet: 0n,
        isFolded: false,
        isAllIn: false,
        isDealer: player.isDealer,
        isActive: true,
      });
    });

    socket.on("player:left", (data) => {
      console.log(`Player left seat ${data.seatNumber}`);
      gameStore.removePlayer(data.seatNumber);
    });

    socket.on("table:pot-update", (data) => {
      gameStore.setPot(BigInt(data.pot));
    });

    socket.on("table:chat", (data) => {
      console.log(`[Chat] ${data.playerId}: ${data.message}`);
    });

    // Mental Poker event handlers
    socket.on("mental-poker:phase", (data) => {
      console.log(`Mental Poker phase: ${data.phase}`, data.currentShuffler);
      gameStore.setMentalPokerPhase(
        data.phase as Parameters<typeof gameStore.setMentalPokerPhase>[0]
      );
      gameStore.setCurrentShuffler(data.currentShuffler || null);
    });

    socket.on("mental-poker:commitment-received", (data) => {
      console.log(`Commitment received from ${data.playerId}: ${data.commitmentsReceived}/${data.totalPlayers}`);
      gameStore.setCommitmentsReceived(data.commitmentsReceived);
    });

    socket.on("mental-poker:shuffle-turn", (data) => {
      console.log(`Shuffle turn for player ${data.playerId}`);
      gameStore.setEncryptedDeck(data.encryptedDeck);
      // Check if it's my turn to shuffle (use ref to get current value)
      if (data.playerId === playerIdRef.current) {
        gameStore.setIsMyShuffleTurn(true);
      }
    });

    socket.on("mental-poker:shuffle-complete", (data) => {
      console.log("Shuffle complete");
      gameStore.setEncryptedDeck(data.encryptedDeck);
      gameStore.setIsMyShuffleTurn(false);
    });

    socket.on("mental-poker:request-key", (data) => {
      console.log(`Key request for card ${data.cardPosition} (${data.cardType})`);
      gameStore.addPendingKeyRequest({
        cardPosition: data.cardPosition,
        cardType: data.cardType,
        recipientId: data.recipientId,
      });
    });

    socket.on("mental-poker:key-revealed", (data) => {
      console.log(`Key revealed by ${data.playerId} for card ${data.cardPosition}`);
      if (data.complete) {
        gameStore.removePendingKeyRequest(data.cardPosition);
      }
    });

    socket.on("mental-poker:card-revealed", (data) => {
      console.log(`Card ${data.cardPosition} revealed (${data.cardType})`);
      // The actual card decryption happens on the client side
    });

    // Cleanup: only log, actual disconnection is handled at the start of the effect
    // when address changes or wallet disconnects
    return () => {
      console.log('[WebSocket] Effect cleanup called');
    };
  }, [isWalletConnected, address]); // Removed playerId to prevent reconnection loops

  // Disconnect socket when component unmounts
  useEffect(() => {
    return () => {
      console.log('[WebSocket] Component unmounting, disconnecting socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Action handlers
  const joinTable = useCallback(
    (
      tableId: string,
      seatNumber: number,
      buyIn: string
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(
          "table:join",
          { tableId, seatNumber, buyIn },
          (response) => {
            if (response.success && response.player) {
              setPlayerId(response.player.id);
              gameStore.setTableId(tableId);
              gameStore.setMySeat(seatNumber);
              if (response.gameState) {
                // Set all game state from response
                gameStore.setPhase(
                  response.gameState.phase as Parameters<typeof gameStore.setPhase>[0]
                );
                gameStore.setPot(BigInt(response.gameState.pot));
                gameStore.setCurrentBet(BigInt(response.gameState.currentBet));
                gameStore.setCommunityCards(response.gameState.communityCards);

                // Process all existing players at the table
                for (const player of response.gameState.players) {
                  gameStore.addOrUpdatePlayer(player.seatNumber, {
                    walletAddress: player.walletAddress,
                    username: player.username,
                    stack: BigInt(player.chips),
                    currentBet: BigInt(player.bet),
                    isFolded: player.isFolded,
                    isAllIn: player.isAllIn,
                    isDealer: player.isDealer,
                    isActive: !player.isFolded && player.isActive,
                  });
                }
              }
            }
            resolve(response);
          }
        );
      });
    },
    []
  );

  const leaveTable = useCallback((): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ success: false, error: "Not connected" });
        return;
      }

      socketRef.current.emit("table:leave", (response) => {
        if (response.success) {
          setPlayerId(null);
          gameStore.resetTable();
        }
        resolve(response);
      });
    });
  }, []);

  const sendAction = useCallback(
    (
      action: string,
      amount?: string
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(
          "game:action",
          { action, amount },
          (response) => {
            resolve(response);
          }
        );
      });
    },
    []
  );

  const sendChat = useCallback((message: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit("chat:send", { message }, (response) => {
      if (!response.success) {
        console.error("Failed to send chat:", response.error);
      }
    });
  }, []);

  // Mental Poker actions
  const sendCommitment = useCallback(
    (commitment: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(
          "mental-poker:commit",
          { commitment },
          (response) => {
            if (response.success) {
              gameStore.setCommitmentsSent(true);
            }
            resolve(response);
          }
        );
      });
    },
    []
  );

  const sendShuffle = useCallback(
    (encryptedDeck: string[]): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(
          "mental-poker:shuffle",
          { encryptedDeck },
          (response) => {
            if (response.success) {
              gameStore.setIsMyShuffleTurn(false);
            }
            resolve(response);
          }
        );
      });
    },
    []
  );

  const sendKeyReveal = useCallback(
    (data: {
      cardPosition: number;
      decryptionKey: string;
      commitment: string;
      salt: string;
    }): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit("mental-poker:reveal-key", data, (response) => {
          resolve(response);
        });
      });
    },
    []
  );

  const value: WebSocketContextValue = {
    socket: socketRef.current,
    isConnected,
    playerId,
    joinTable,
    leaveTable,
    sendAction,
    sendChat,
    sendCommitment,
    sendShuffle,
    sendKeyReveal,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}
