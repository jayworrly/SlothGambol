import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown";

export type MentalPokerPhase =
  | "inactive"
  | "commitment"
  | "shuffle"
  | "deal"
  | "play"
  | "complete";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "all_in";

export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string; // "2" - "10", "J", "Q", "K", "A"
  encrypted?: string; // Encrypted form for mental poker
}

export interface Player {
  id: string;
  walletAddress: string;
  username?: string;
  avatar?: string;
  position: number; // 0-8 for table position
  stack: bigint;
  currentBet: bigint;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isTurn: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isSittingOut: boolean;
  holeCards?: Card[]; // Only visible to the player themselves
  showCards?: boolean; // For showdown
}

export interface AvailableAction {
  type: ActionType;
  minAmount?: bigint;
  maxAmount?: bigint;
}

export interface GameState {
  // Connection state
  isConnected: boolean;
  tableId: string | null;
  tableCapacity: 2 | 6 | 9;

  // Game phase
  phase: GamePhase;
  handNumber: number;

  // Pot and betting
  pot: bigint;
  currentBet: bigint;
  minRaise: bigint;

  // Players
  players: Player[];
  myPosition: number | null;
  currentActorPosition: number | null;

  // Cards
  communityCards: Card[];
  myHoleCards: Card[];

  // Actions
  availableActions: AvailableAction[];
  actionDeadline: number | null; // Unix timestamp

  // Mental poker state
  mentalPokerPhase: MentalPokerPhase;
  mentalPokerEnabled: boolean;
  encryptedDeck: string[];
  revealedKeys: Map<number, string[]>;
  commitmentsSent: boolean;
  commitmentsReceived: number;
  currentShuffler: string | null;
  isMyShuffleTurn: boolean;
  pendingKeyRequests: Array<{
    cardPosition: number;
    cardType: 'hole' | 'community';
    recipientId?: string;
  }>;

  // Chat
  messages: { player: string; message: string; timestamp: number }[];
}

export interface GameActions {
  // Connection
  setConnected: (connected: boolean) => void;
  setTableId: (tableId: string | null) => void;
  setTableCapacity: (capacity: 2 | 6 | 9) => void;

  // Game state updates
  setPhase: (phase: GamePhase) => void;
  setHandNumber: (handNumber: number) => void;
  setPot: (pot: bigint) => void;
  setCurrentBet: (bet: bigint) => void;

  // Player updates
  setPlayers: (players: Player[]) => void;
  updatePlayer: (position: number, updates: Partial<Player>) => void;
  addOrUpdatePlayer: (position: number, playerData: {
    walletAddress: string;
    username?: string;
    stack: bigint;
    currentBet: bigint;
    isFolded: boolean;
    isAllIn: boolean;
    isDealer: boolean;
    isActive: boolean;
  }) => void;
  removePlayer: (position: number) => void;
  setMyPosition: (position: number | null) => void;
  setMySeat: (position: number) => void;
  setCurrentActor: (position: number | null) => void;

  // Card updates
  setCommunityCards: (cards: Card[]) => void;
  addCommunityCard: (card: Card) => void;
  setMyHoleCards: (cards: Card[]) => void;

  // Action updates
  setAvailableActions: (actions: AvailableAction[]) => void;
  setActionDeadline: (deadline: number | null) => void;

  // Mental poker
  setMentalPokerPhase: (phase: MentalPokerPhase) => void;
  setMentalPokerEnabled: (enabled: boolean) => void;
  setEncryptedDeck: (deck: string[]) => void;
  addRevealedKey: (cardIndex: number, key: string) => void;
  setCommitmentsSent: (sent: boolean) => void;
  setCommitmentsReceived: (count: number) => void;
  setCurrentShuffler: (shuffler: string | null) => void;
  setIsMyShuffleTurn: (isTurn: boolean) => void;
  addPendingKeyRequest: (request: { cardPosition: number; cardType: 'hole' | 'community'; recipientId?: string }) => void;
  removePendingKeyRequest: (cardPosition: number) => void;
  clearPendingKeyRequests: () => void;

  // Chat
  addMessage: (player: string, message: string) => void;

  // Reset
  resetHand: () => void;
  resetTable: () => void;
}

const initialState: GameState = {
  isConnected: false,
  tableId: null,
  tableCapacity: 9,
  phase: "waiting",
  handNumber: 0,
  pot: 0n,
  currentBet: 0n,
  minRaise: 0n,
  players: [],
  myPosition: null,
  currentActorPosition: null,
  communityCards: [],
  myHoleCards: [],
  availableActions: [],
  actionDeadline: null,
  // Mental poker
  mentalPokerPhase: "inactive",
  mentalPokerEnabled: false,
  encryptedDeck: [],
  revealedKeys: new Map(),
  commitmentsSent: false,
  commitmentsReceived: 0,
  currentShuffler: null,
  isMyShuffleTurn: false,
  pendingKeyRequests: [],
  // Chat
  messages: [],
};

export const useGameStore = create<GameState & GameActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setConnected: (connected) => set({ isConnected: connected }),
    setTableId: (tableId) => set({ tableId }),
    setTableCapacity: (capacity) => set({ tableCapacity: capacity }),

    setPhase: (phase) => set({ phase }),
    setHandNumber: (handNumber) => set({ handNumber }),
    setPot: (pot) => set({ pot }),
    setCurrentBet: (bet) => set({ currentBet: bet }),

    setPlayers: (players) => set({ players }),
    updatePlayer: (position, updates) =>
      set((state) => ({
        players: state.players.map((p) =>
          p.position === position ? { ...p, ...updates } : p
        ),
      })),
    addOrUpdatePlayer: (position, playerData) =>
      set((state) => {
        const existingIndex = state.players.findIndex((p) => p.position === position);
        const newPlayer: Player = {
          id: `player-${position}`,
          walletAddress: playerData.walletAddress,
          username: playerData.username,
          position,
          stack: playerData.stack,
          currentBet: playerData.currentBet,
          isDealer: playerData.isDealer,
          isSmallBlind: false,
          isBigBlind: false,
          isTurn: false,
          isFolded: playerData.isFolded,
          isAllIn: playerData.isAllIn,
          isSittingOut: !playerData.isActive,
        };
        if (existingIndex >= 0) {
          const newPlayers = [...state.players];
          newPlayers[existingIndex] = { ...state.players[existingIndex], ...newPlayer };
          return { players: newPlayers };
        } else {
          return { players: [...state.players, newPlayer] };
        }
      }),
    removePlayer: (position) =>
      set((state) => ({
        players: state.players.filter((p) => p.position !== position),
      })),
    setMyPosition: (position) => set({ myPosition: position }),
    setMySeat: (position) => set({ myPosition: position }),
    setCurrentActor: (position) => set({ currentActorPosition: position }),

    setCommunityCards: (cards) => set({ communityCards: cards }),
    addCommunityCard: (card) =>
      set((state) => ({
        communityCards: [...state.communityCards, card],
      })),
    setMyHoleCards: (cards) => set({ myHoleCards: cards }),

    setAvailableActions: (actions) => set({ availableActions: actions }),
    setActionDeadline: (deadline) => set({ actionDeadline: deadline }),

    setMentalPokerPhase: (phase) => set({ mentalPokerPhase: phase }),
    setMentalPokerEnabled: (enabled) => set({ mentalPokerEnabled: enabled }),
    setEncryptedDeck: (deck) => set({ encryptedDeck: deck }),
    addRevealedKey: (cardIndex, key) =>
      set((state) => {
        const newKeys = new Map(state.revealedKeys);
        const existing = newKeys.get(cardIndex) || [];
        newKeys.set(cardIndex, [...existing, key]);
        return { revealedKeys: newKeys };
      }),
    setCommitmentsSent: (sent) => set({ commitmentsSent: sent }),
    setCommitmentsReceived: (count) => set({ commitmentsReceived: count }),
    setCurrentShuffler: (shuffler) => set({ currentShuffler: shuffler }),
    setIsMyShuffleTurn: (isTurn) => set({ isMyShuffleTurn: isTurn }),
    addPendingKeyRequest: (request) =>
      set((state) => ({
        pendingKeyRequests: [...state.pendingKeyRequests, request],
      })),
    removePendingKeyRequest: (cardPosition) =>
      set((state) => ({
        pendingKeyRequests: state.pendingKeyRequests.filter(
          (r) => r.cardPosition !== cardPosition
        ),
      })),
    clearPendingKeyRequests: () => set({ pendingKeyRequests: [] }),

    addMessage: (player, message) =>
      set((state) => ({
        messages: [
          ...state.messages,
          { player, message, timestamp: Date.now() },
        ].slice(-100), // Keep last 100 messages
      })),

    resetHand: () =>
      set({
        phase: "waiting",
        pot: 0n,
        currentBet: 0n,
        minRaise: 0n,
        currentActorPosition: null,
        communityCards: [],
        myHoleCards: [],
        availableActions: [],
        actionDeadline: null,
        // Mental poker reset
        mentalPokerPhase: "inactive",
        encryptedDeck: [],
        revealedKeys: new Map(),
        commitmentsSent: false,
        commitmentsReceived: 0,
        currentShuffler: null,
        isMyShuffleTurn: false,
        pendingKeyRequests: [],
      }),

    resetTable: () => set(initialState),
  }))
);

// Selectors for common queries
export const selectIsMyTurn = (state: GameState) =>
  state.myPosition !== null &&
  state.currentActorPosition === state.myPosition;

export const selectMyPlayer = (state: GameState) =>
  state.players.find((p) => p.position === state.myPosition);

export const selectActivePlayers = (state: GameState) =>
  state.players.filter((p) => !p.isFolded && !p.isSittingOut);
