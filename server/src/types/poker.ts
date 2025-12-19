// Card representation
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Player representation
export interface Player {
  id: string;
  walletAddress: string;
  username: string;
  seatNumber: number;
  chips: bigint;
  cards: Card[];
  bet: bigint;
  totalBet: bigint;
  isActive: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isSittingOut: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction: PlayerAction | null;
  disconnectedAt: number | null;
}

// Game phases
export type GamePhase =
  | 'waiting'      // Waiting for players
  | 'starting'     // Game about to start
  | 'preflop'      // Before community cards
  | 'flop'         // First 3 community cards
  | 'turn'         // 4th community card
  | 'river'        // 5th community card
  | 'showdown'     // Revealing hands
  | 'finished';    // Hand complete

// Player actions
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerAction {
  type: ActionType;
  amount: bigint;
  timestamp: number;
}

// Game variants
export type GameVariant = 'texas-holdem' | 'omaha' | 'omaha-hi-lo';

// Table configuration
export interface TableConfig {
  id: string;
  name: string;
  variant: GameVariant;
  maxPlayers: number;
  minPlayers: number;
  smallBlind: bigint;
  bigBlind: bigint;
  minBuyIn: bigint;
  maxBuyIn: bigint;
  timeBank: number; // seconds per action
  isPrivate: boolean;
  password?: string;
}

// Game state
export interface GameState {
  tableId: string;
  config: TableConfig;
  phase: GamePhase;
  players: Map<string, Player>;
  communityCards: Card[];
  pot: bigint;
  sidePots: SidePot[];
  currentBet: bigint;
  minRaise: bigint;
  dealerSeat: number;
  currentPlayerSeat: number;
  lastRaiserSeat: number | null;
  handNumber: number;
  deck: Card[];
  actionHistory: GameAction[];
  turnStartTime: number;
  // Mental poker state
  mentalPokerState: MentalPokerState;
}

// Side pot for all-in situations
export interface SidePot {
  amount: bigint;
  eligiblePlayers: string[]; // player IDs
}

// Game action for history
export interface GameAction {
  playerId: string;
  action: PlayerAction;
  phase: GamePhase;
  timestamp: number;
}

// Mental poker state for trustless dealing
export interface MentalPokerState {
  shuffleCommitments: Map<string, string>; // playerId -> commitment hash
  encryptedDeck: string[];
  revealedCards: Map<number, Card>; // card index -> revealed card
  playerKeys: Map<string, PlayerMentalPokerKeys>;
}

export interface PlayerMentalPokerKeys {
  publicKey: string;
  encryptionProof: string;
}

// Hand result
export interface HandResult {
  winners: WinnerInfo[];
  handRankings: Map<string, HandRanking>;
  pots: PotResult[];
}

export interface WinnerInfo {
  playerId: string;
  amount: bigint;
  hand: HandRanking;
}

export interface PotResult {
  amount: bigint;
  winners: string[];
  type: 'main' | 'side';
}

// Hand ranking
export interface HandRanking {
  rank: HandRankType;
  cards: Card[];
  kickers: Card[];
  description: string;
}

export type HandRankType =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

// Socket events
export interface ServerToClientEvents {
  // Game state updates
  'game:state': (state: SerializedGameState) => void;
  'game:started': (data: { handNumber: number }) => void;
  'game:phase-change': (data: { phase: GamePhase; communityCards: SerializedCard[] }) => void;
  'game:player-action': (data: { playerId: string; action: SerializedPlayerAction }) => void;
  'game:turn': (data: { playerId: string; seatNumber: number; timeRemaining: number; availableActions: ActionType[] }) => void;
  'game:hand-result': (result: SerializedHandResult) => void;

  // Player updates
  'player:joined': (player: SerializedPlayer) => void;
  'player:left': (data: { playerId: string; seatNumber: number }) => void;
  'player:cards': (cards: SerializedCard[]) => void;
  'player:chips-update': (data: { playerId: string; chips: string }) => void;

  // Table updates
  'table:pot-update': (data: { pot: string; sidePots: SerializedSidePot[] }) => void;
  'table:chat': (data: { playerId: string; message: string; timestamp: number }) => void;

  // Mental poker events
  'mental-poker:phase': (data: { phase: string; currentShuffler?: string }) => void;
  'mental-poker:commitment-received': (data: { playerId: string; commitmentsReceived: number; totalPlayers: number }) => void;
  'mental-poker:shuffle-turn': (data: { playerId: string; encryptedDeck: string[] }) => void;
  'mental-poker:shuffle-complete': (data: { encryptedDeck: string[] }) => void;
  'mental-poker:request-key': (data: { cardPosition: number; cardType: 'hole' | 'community'; recipientId?: string }) => void;
  'mental-poker:key-revealed': (data: { playerId: string; cardPosition: number; complete: boolean; playersNeeded: string[] }) => void;
  'mental-poker:card-revealed': (data: { cardPosition: number; cardType: 'hole' | 'community'; recipientId?: string }) => void;

  // Errors and notifications
  'error': (data: { code: string; message: string }) => void;
  'notification': (data: { type: 'info' | 'warning' | 'success'; message: string }) => void;
}

export interface ClientToServerEvents {
  // Table actions
  'table:join': (data: { tableId: string; seatNumber: number; buyIn: string }, callback: (response: JoinResponse) => void) => void;
  'table:leave': (callback: (response: BaseResponse) => void) => void;
  'table:sit-out': (callback: (response: BaseResponse) => void) => void;
  'table:sit-in': (callback: (response: BaseResponse) => void) => void;
  'table:add-chips': (data: { amount: string }, callback: (response: BaseResponse) => void) => void;
  'table:create': (data: {
    name?: string;
    variant?: GameVariant;
    smallBlind?: string;
    bigBlind?: string;
    minBuyIn?: string;
    maxBuyIn?: string;
    maxPlayers?: number;
    timeBank?: number;
    isPrivate?: boolean;
  }, callback: (response: CreateTableResponse) => void) => void;

  // Game actions
  'game:action': (data: { action: ActionType; amount?: string }, callback: (response: ActionResponse) => void) => void;
  'game:show-cards': (callback: (response: BaseResponse) => void) => void;

  // Mental poker
  'mental-poker:commit': (data: { commitment: string }, callback: (response: BaseResponse) => void) => void;
  'mental-poker:shuffle': (data: { encryptedDeck: string[] }, callback: (response: BaseResponse) => void) => void;
  'mental-poker:reveal-key': (data: { cardPosition: number; decryptionKey: string; commitment: string; salt: string }, callback: (response: BaseResponse) => void) => void;

  // Chat
  'chat:send': (data: { message: string }, callback: (response: BaseResponse) => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  walletAddress: string;
  tableId: string | null;
  sessionId?: string; // Database session ID for tracking
}

// Response types
export interface BaseResponse {
  success: boolean;
  error?: string;
}

export interface JoinResponse extends BaseResponse {
  player?: SerializedPlayer;
  gameState?: SerializedGameState;
}

export interface ActionResponse extends BaseResponse {
  newChips?: string;
  pot?: string;
}

export interface CreateTableResponse extends BaseResponse {
  tableId?: string;
  config?: SerializedTableConfig;
}

// Serialized types (bigint -> string for JSON)
export interface SerializedCard {
  suit: Suit;
  rank: Rank;
}

export interface SerializedPlayer {
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
  lastAction: SerializedPlayerAction | null;
  hasCards: boolean;
}

export interface SerializedPlayerAction {
  type: ActionType;
  amount: string;
  timestamp: number;
}

export interface SerializedSidePot {
  amount: string;
  eligiblePlayers: string[];
}

export interface SerializedGameState {
  tableId: string;
  config: SerializedTableConfig;
  phase: GamePhase;
  players: SerializedPlayer[];
  communityCards: SerializedCard[];
  pot: string;
  sidePots: SerializedSidePot[];
  currentBet: string;
  dealerSeat: number;
  currentPlayerSeat: number;
  handNumber: number;
  turnStartTime: number;
}

export interface SerializedTableConfig {
  id: string;
  name: string;
  variant: GameVariant;
  maxPlayers: number;
  minPlayers: number;
  smallBlind: string;
  bigBlind: string;
  minBuyIn: string;
  maxBuyIn: string;
  timeBank: number;
  isPrivate: boolean;
}

export interface SerializedHandResult {
  winners: SerializedWinnerInfo[];
  pots: SerializedPotResult[];
}

export interface SerializedWinnerInfo {
  playerId: string;
  amount: string;
  hand: {
    rank: HandRankType;
    description: string;
  };
}

export interface SerializedPotResult {
  amount: string;
  winners: string[];
  type: 'main' | 'side';
}
