import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameState,
  Player,
  Card,
  TableConfig,
  ActionType,
  PlayerAction,
  HandResult,
  WinnerInfo,
  SerializedGameState,
  SerializedPlayer,
  SerializedCard,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData
} from '../types/poker.js';
import { createDeck, shuffleDeck, findBestHand, compareHands } from '../utils/handEvaluator.js';
import { MentalPokerCoordinator } from '../mental-poker/coordinator.js';

type PokerSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

export class GameRoom {
  private io: Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
  private state: GameState;
  private sockets: Map<string, PokerSocket> = new Map();
  private turnTimer: NodeJS.Timeout | null = null;
  private gameLoopTimer: NodeJS.Timeout | null = null;
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  // Mental Poker
  private mentalPokerEnabled: boolean = false; // Can be enabled per-table
  private mentalPokerCoordinator: MentalPokerCoordinator | null = null;

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    config: TableConfig
  ) {
    this.io = io;
    this.state = this.createInitialState(config);
  }

  private createInitialState(config: TableConfig): GameState {
    return {
      tableId: config.id,
      config,
      phase: 'waiting',
      players: new Map(),
      communityCards: [],
      pot: 0n,
      sidePots: [],
      currentBet: 0n,
      minRaise: config.bigBlind,
      dealerSeat: -1,
      currentPlayerSeat: -1,
      lastRaiserSeat: null,
      handNumber: 0,
      deck: [],
      actionHistory: [],
      turnStartTime: 0,
      mentalPokerState: {
        shuffleCommitments: new Map(),
        encryptedDeck: [],
        revealedCards: new Map(),
        playerKeys: new Map()
      }
    };
  }

  // Player Management
  addPlayer(
    socket: PokerSocket,
    walletAddress: string,
    username: string,
    seatNumber: number,
    buyIn: bigint
  ): Player | null {
    // Validate seat
    if (seatNumber < 0 || seatNumber >= this.state.config.maxPlayers) {
      return null;
    }

    // Check if seat is taken
    for (const player of this.state.players.values()) {
      if (player.seatNumber === seatNumber) {
        return null;
      }
    }

    // Validate buy-in
    if (buyIn < this.state.config.minBuyIn || buyIn > this.state.config.maxBuyIn) {
      return null;
    }

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      walletAddress,
      username,
      seatNumber,
      chips: buyIn,
      cards: [],
      bet: 0n,
      totalBet: 0n,
      isActive: true,
      isFolded: false,
      isAllIn: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      lastAction: null,
      disconnectedAt: null
    };

    this.state.players.set(playerId, player);
    this.sockets.set(playerId, socket);

    // Join socket room
    socket.join(this.state.tableId);
    socket.data.playerId = playerId;
    socket.data.tableId = this.state.tableId;

    // Broadcast to all players
    this.broadcastPlayerJoined(player);

    // Check if we can start
    this.checkGameStart();

    return player;
  }

  removePlayer(playerId: string): boolean {
    const player = this.state.players.get(playerId);
    if (!player) return false;

    const socket = this.sockets.get(playerId);
    if (socket) {
      socket.leave(this.state.tableId);
      socket.data.tableId = null;
      this.sockets.delete(playerId);
    }

    const seatNumber = player.seatNumber;
    this.state.players.delete(playerId);

    // Broadcast departure
    this.io.to(this.state.tableId).emit('player:left', { playerId, seatNumber });

    // Handle mid-game departure
    if (this.state.phase !== 'waiting' && this.state.phase !== 'finished') {
      this.handlePlayerDisconnect(playerId);
    }

    return true;
  }

  handlePlayerDisconnect(playerId: string): void {
    const player = this.state.players.get(playerId);
    if (!player) return;

    player.disconnectedAt = Date.now();

    // Clear any existing disconnect timer for this player
    const existingTimer = this.disconnectTimers.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // If it's their turn, auto-fold after short timeout
    if (this.isPlayerTurn(playerId)) {
      // Give 30 seconds for reconnection before auto-folding
      setTimeout(() => {
        const currentPlayer = this.state.players.get(playerId);
        if (currentPlayer?.disconnectedAt && this.isPlayerTurn(playerId)) {
          this.handleAction(playerId, 'fold', 0n);
        }
      }, 30000);
    }

    // Set timer to remove player after 60 seconds of disconnect
    const removeTimer = setTimeout(() => {
      const disconnectedPlayer = this.state.players.get(playerId);
      // Only remove if still disconnected (hasn't reconnected)
      if (disconnectedPlayer?.disconnectedAt) {
        console.log(`Removing player ${playerId} after disconnect timeout`);
        this.removePlayer(playerId);
      }
      this.disconnectTimers.delete(playerId);
    }, 60000); // 60 second grace period for reconnection

    this.disconnectTimers.set(playerId, removeTimer);
  }

  // Handle player reconnection
  handlePlayerReconnect(playerId: string, socket: PokerSocket): boolean {
    const player = this.state.players.get(playerId);
    if (!player) return false;

    // Clear disconnect timer
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    // Clear disconnected status
    player.disconnectedAt = null;

    // Update socket reference
    this.sockets.set(playerId, socket);
    socket.join(this.state.tableId);
    socket.data.playerId = playerId;
    socket.data.tableId = this.state.tableId;

    // Send current game state to reconnected player
    socket.emit('game:state', this.serializeState());

    // Send their hole cards if in an active hand
    if (player.cards.length > 0) {
      socket.emit('player:cards', player.cards.map(c => this.serializeCard(c)));
    }

    // If it's their turn, re-send the turn notification with available actions
    if (this.isPlayerTurn(playerId) && this.state.phase !== 'waiting' && this.state.phase !== 'finished') {
      const validActions = this.getValidActions(playerId);
      const remainingTime = Math.max(0, Math.floor((this.state.config.timeBank * 1000 - (Date.now() - this.state.turnStartTime)) / 1000));
      socket.emit('game:turn', {
        playerId: playerId,
        seatNumber: player.seatNumber,
        timeRemaining: remainingTime,
        availableActions: validActions
      });
      console.log(`Resent game:turn to reconnected player ${player.username}, actions: ${validActions.join(', ')}`);
    }

    console.log(`Player ${player.username} reconnected to table ${this.state.tableId}`);
    return true;
  }

  // Game Flow
  private checkGameStart(): void {
    const activePlayers = this.getActivePlayers();
    console.log(`[checkGameStart] Active players: ${activePlayers.length}, minPlayers: ${this.state.config.minPlayers}, phase: ${this.state.phase}`);

    if (activePlayers.length >= this.state.config.minPlayers && this.state.phase === 'waiting') {
      console.log('[checkGameStart] Starting game in 3 seconds...');
      // Start game after a short delay
      setTimeout(() => {
        console.log('[checkGameStart] Timer fired, calling startNewHand');
        this.startNewHand();
      }, 3000);
    }
  }

  private startNewHand(): void {
    console.log('[startNewHand] Starting new hand...');
    const activePlayers = this.getActivePlayers();
    console.log(`[startNewHand] Active players: ${activePlayers.length}`);

    if (activePlayers.length < this.state.config.minPlayers) {
      console.log('[startNewHand] Not enough players, setting phase to waiting');
      this.state.phase = 'waiting';
      return;
    }

    this.state.handNumber++;
    this.state.phase = 'starting';
    this.state.communityCards = [];
    this.state.pot = 0n;
    this.state.sidePots = [];
    this.state.currentBet = 0n;
    this.state.minRaise = this.state.config.bigBlind;
    this.state.lastRaiserSeat = null;
    this.state.actionHistory = [];

    // Reset player states
    for (const player of this.state.players.values()) {
      player.cards = [];
      player.bet = 0n;
      player.totalBet = 0n;
      player.isFolded = false;
      player.isAllIn = false;
      player.isDealer = false;
      player.isSmallBlind = false;
      player.isBigBlind = false;
      player.lastAction = null;
    }

    // Move dealer button
    this.moveDealer();

    // Post blinds
    this.postBlinds();

    // Create and shuffle deck
    this.state.deck = shuffleDeck(createDeck());

    // Deal hole cards
    this.dealHoleCards();

    // Start preflop
    this.state.phase = 'preflop';

    // Set first player to act in preflop
    this.setPreflopFirstToAct();

    console.log(`[startNewHand] Emitting game:started for hand #${this.state.handNumber}`);
    this.io.to(this.state.tableId).emit('game:started', { handNumber: this.state.handNumber });
    console.log('[startNewHand] Broadcasting state...');
    this.broadcastState();
    console.log(`[startNewHand] Hand started successfully, first to act: seat ${this.state.currentPlayerSeat}`);

    // Start action
    this.startPlayerTurn();
  }

  private setPreflopFirstToAct(): void {
    const players = this.getActivePlayersInSeatOrder();
    const dealerIndex = players.findIndex(p => p.seatNumber === this.state.dealerSeat);

    if (players.length === 2) {
      // Heads up: dealer/small blind acts first preflop
      this.state.currentPlayerSeat = players[dealerIndex].seatNumber;
    } else {
      // 3+ players: UTG (player after big blind) acts first
      // Big blind is 2 positions after dealer, so UTG is 3 positions after dealer
      const utgIndex = (dealerIndex + 3) % players.length;
      this.state.currentPlayerSeat = players[utgIndex].seatNumber;
    }

    console.log(`[setPreflopFirstToAct] Set first to act: seat ${this.state.currentPlayerSeat}`);
  }

  private moveDealer(): void {
    const players = this.getActivePlayersInSeatOrder();
    if (players.length === 0) return;

    if (this.state.dealerSeat === -1) {
      // First hand - random dealer
      const randomIndex = Math.floor(Math.random() * players.length);
      this.state.dealerSeat = players[randomIndex].seatNumber;
    } else {
      // Move to next active player
      let currentIndex = players.findIndex(p => p.seatNumber === this.state.dealerSeat);
      currentIndex = (currentIndex + 1) % players.length;
      this.state.dealerSeat = players[currentIndex].seatNumber;
    }

    // Mark dealer
    for (const player of this.state.players.values()) {
      player.isDealer = player.seatNumber === this.state.dealerSeat;
    }
  }

  private postBlinds(): void {
    const players = this.getActivePlayersInSeatOrder();
    const dealerIndex = players.findIndex(p => p.seatNumber === this.state.dealerSeat);

    if (players.length === 2) {
      // Heads up - dealer posts small blind
      const sbPlayer = players[dealerIndex];
      const bbPlayer = players[(dealerIndex + 1) % 2];
      this.postBlind(sbPlayer, this.state.config.smallBlind, true);
      this.postBlind(bbPlayer, this.state.config.bigBlind, false);
    } else {
      // Normal - player after dealer posts small blind
      const sbIndex = (dealerIndex + 1) % players.length;
      const bbIndex = (dealerIndex + 2) % players.length;
      this.postBlind(players[sbIndex], this.state.config.smallBlind, true);
      this.postBlind(players[bbIndex], this.state.config.bigBlind, false);
    }

    this.state.currentBet = this.state.config.bigBlind;
  }

  private postBlind(player: Player, amount: bigint, isSmall: boolean): void {
    const actualAmount = player.chips < amount ? player.chips : amount;
    player.chips -= actualAmount;
    player.bet = actualAmount;
    player.totalBet = actualAmount;
    this.state.pot += actualAmount;

    if (player.chips === 0n) {
      player.isAllIn = true;
    }

    if (isSmall) {
      player.isSmallBlind = true;
    } else {
      player.isBigBlind = true;
    }
  }

  private dealHoleCards(): void {
    const players = this.getActivePlayersInSeatOrder();

    // Deal 2 cards to each player (Texas Hold'em)
    for (let i = 0; i < 2; i++) {
      for (const player of players) {
        const card = this.state.deck.pop()!;
        player.cards.push(card);
      }
    }

    // Send private cards to each player
    for (const [playerId, player] of this.state.players) {
      const socket = this.sockets.get(playerId);
      if (socket) {
        socket.emit('player:cards', player.cards.map(c => this.serializeCard(c)));
      }
    }
  }

  // Action Handling
  handleAction(playerId: string, actionType: ActionType, amount: bigint): boolean {
    const player = this.state.players.get(playerId);
    if (!player || !this.isPlayerTurn(playerId)) {
      return false;
    }

    // Validate and process action
    const validActions = this.getValidActions(playerId);
    if (!validActions.includes(actionType)) {
      return false;
    }

    this.clearTurnTimer();

    const action: PlayerAction = {
      type: actionType,
      amount: 0n,
      timestamp: Date.now()
    };

    switch (actionType) {
      case 'fold':
        player.isFolded = true;
        break;

      case 'check':
        // No action needed, bet stays same
        break;

      case 'call': {
        const callAmount = this.state.currentBet - player.bet;
        const actualCall = player.chips < callAmount ? player.chips : callAmount;
        player.chips -= actualCall;
        player.bet += actualCall;
        player.totalBet += actualCall;
        this.state.pot += actualCall;
        action.amount = actualCall;
        if (player.chips === 0n) {
          player.isAllIn = true;
        }
        break;
      }

      case 'bet': {
        if (amount < this.state.config.bigBlind) return false;
        const actualBet = player.chips < amount ? player.chips : amount;
        player.chips -= actualBet;
        player.bet = actualBet;
        player.totalBet += actualBet;
        this.state.pot += actualBet;
        this.state.currentBet = player.bet;
        this.state.minRaise = actualBet;
        this.state.lastRaiserSeat = player.seatNumber;
        action.amount = actualBet;
        if (player.chips === 0n) {
          player.isAllIn = true;
        }
        break;
      }

      case 'raise': {
        const raiseAmount = amount;
        const totalBet = this.state.currentBet + raiseAmount;
        const needed = totalBet - player.bet;
        if (raiseAmount < this.state.minRaise && player.chips > needed) {
          return false; // Invalid raise size
        }
        const actual = player.chips < needed ? player.chips : needed;
        player.chips -= actual;
        player.bet += actual;
        player.totalBet += actual;
        this.state.pot += actual;
        if (player.bet > this.state.currentBet) {
          this.state.minRaise = player.bet - this.state.currentBet;
          this.state.currentBet = player.bet;
          this.state.lastRaiserSeat = player.seatNumber;
        }
        action.amount = actual;
        if (player.chips === 0n) {
          player.isAllIn = true;
        }
        break;
      }

      case 'all-in': {
        const allInAmount = player.chips;
        player.bet += allInAmount;
        player.totalBet += allInAmount;
        this.state.pot += allInAmount;
        player.chips = 0n;
        player.isAllIn = true;
        if (player.bet > this.state.currentBet) {
          this.state.minRaise = player.bet - this.state.currentBet;
          this.state.currentBet = player.bet;
          this.state.lastRaiserSeat = player.seatNumber;
        }
        action.amount = allInAmount;
        break;
      }
    }

    player.lastAction = action;
    this.state.actionHistory.push({
      playerId,
      action,
      phase: this.state.phase,
      timestamp: Date.now()
    });

    // Broadcast action
    this.io.to(this.state.tableId).emit('game:player-action', {
      playerId,
      action: {
        type: action.type,
        amount: action.amount.toString(),
        timestamp: action.timestamp
      }
    });

    // Check for round/hand completion
    this.advanceGame();

    return true;
  }

  private advanceGame(): void {
    const activeCount = this.getActivePlayersInHand().length;
    console.log(`[advanceGame] Active players in hand: ${activeCount}`);

    // Check for single winner
    if (activeCount === 1) {
      console.log('[advanceGame] Single winner, ending hand');
      this.endHandSingleWinner();
      return;
    }

    // Check if betting round is complete
    const roundComplete = this.isBettingRoundComplete();
    console.log(`[advanceGame] Betting round complete: ${roundComplete}`);

    if (roundComplete) {
      this.advancePhase();
    } else {
      console.log(`[advanceGame] Moving to next player from seat ${this.state.currentPlayerSeat}`);
      this.moveToNextPlayer();
      console.log(`[advanceGame] Next player seat: ${this.state.currentPlayerSeat}`);
      this.startPlayerTurn();
    }
  }

  private isBettingRoundComplete(): boolean {
    const playersInHand = this.getActivePlayersInHand();
    const playersWhoCanAct = playersInHand.filter(p => !p.isAllIn);

    // All players all-in or only one player left who can act
    if (playersWhoCanAct.length <= 1) {
      // Check if remaining player has matched the bet
      if (playersWhoCanAct.length === 1) {
        const player = playersWhoCanAct[0];
        return player.bet >= this.state.currentBet;
      }
      return true;
    }

    // Check if all active players have acted and matched current bet
    for (const player of playersWhoCanAct) {
      // Player hasn't acted this round
      if (player.lastAction === null) {
        return false;
      }

      // Player needs to match bet (unless they just raised)
      if (player.bet < this.state.currentBet && player.seatNumber !== this.state.lastRaiserSeat) {
        return false;
      }
    }

    // Special case: if someone raised, others need to respond
    if (this.state.lastRaiserSeat !== null) {
      const raiser = Array.from(this.state.players.values())
        .find(p => p.seatNumber === this.state.lastRaiserSeat);

      for (const player of playersWhoCanAct) {
        if (player.id === raiser?.id) continue;
        if (!player.lastAction || player.lastAction.timestamp < raiser!.lastAction!.timestamp) {
          return false;
        }
      }
    }

    return true;
  }

  private advancePhase(): void {
    // Reset for new betting round
    for (const player of this.state.players.values()) {
      player.bet = 0n;
      player.lastAction = null;
    }
    this.state.currentBet = 0n;
    this.state.lastRaiserSeat = null;

    switch (this.state.phase) {
      case 'preflop':
        this.state.phase = 'flop';
        this.dealCommunityCards(3);
        break;
      case 'flop':
        this.state.phase = 'turn';
        this.dealCommunityCards(1);
        break;
      case 'turn':
        this.state.phase = 'river';
        this.dealCommunityCards(1);
        break;
      case 'river':
        this.state.phase = 'showdown';
        this.showdown();
        return;
      default:
        return;
    }

    this.io.to(this.state.tableId).emit('game:phase-change', {
      phase: this.state.phase,
      communityCards: this.state.communityCards.map(c => this.serializeCard(c))
    });

    // Reset to first player after dealer
    this.setFirstToAct();
    this.startPlayerTurn();
  }

  private dealCommunityCards(count: number): void {
    // Burn a card
    this.state.deck.pop();

    // Deal community cards
    for (let i = 0; i < count; i++) {
      const card = this.state.deck.pop()!;
      this.state.communityCards.push(card);
    }
  }

  private setFirstToAct(): void {
    const players = this.getActivePlayersInSeatOrder();
    const dealerIndex = players.findIndex(p => p.seatNumber === this.state.dealerSeat);

    // First active player after dealer
    for (let i = 1; i <= players.length; i++) {
      const player = players[(dealerIndex + i) % players.length];
      if (!player.isFolded && !player.isAllIn) {
        this.state.currentPlayerSeat = player.seatNumber;
        return;
      }
    }
  }

  private moveToNextPlayer(): void {
    const players = this.getActivePlayersInSeatOrder();
    const currentIndex = players.findIndex(p => p.seatNumber === this.state.currentPlayerSeat);

    for (let i = 1; i <= players.length; i++) {
      const player = players[(currentIndex + i) % players.length];
      if (!player.isFolded && !player.isAllIn) {
        this.state.currentPlayerSeat = player.seatNumber;
        return;
      }
    }
  }

  private startPlayerTurn(): void {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) {
      console.log('[startPlayerTurn] No current player found!');
      return;
    }

    this.state.turnStartTime = Date.now();
    const validActions = this.getValidActions(currentPlayer.id);

    console.log(`[startPlayerTurn] Player ${currentPlayer.username} (seat ${currentPlayer.seatNumber}), actions: ${validActions.join(', ')}`);

    this.io.to(this.state.tableId).emit('game:turn', {
      playerId: currentPlayer.id,
      seatNumber: currentPlayer.seatNumber,
      timeRemaining: this.state.config.timeBank,
      availableActions: validActions
    });

    // Start turn timer
    this.turnTimer = setTimeout(() => {
      // Auto-action: check if possible, otherwise fold
      if (validActions.includes('check')) {
        this.handleAction(currentPlayer.id, 'check', 0n);
      } else {
        this.handleAction(currentPlayer.id, 'fold', 0n);
      }
    }, this.state.config.timeBank * 1000);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private showdown(): void {
    console.log('[showdown] Starting showdown...');
    const playersInHand = this.getActivePlayersInHand();

    // Calculate hand rankings
    const handRankings = new Map<string, ReturnType<typeof findBestHand>>();
    for (const player of playersInHand) {
      const hand = findBestHand(player.cards, this.state.communityCards);
      handRankings.set(player.id, hand);
      console.log(`[showdown] Player ${player.username}: ${hand.rank} - ${hand.description}`);
    }

    // Determine winners and distribute pot
    const result = this.distributeWinnings(playersInHand, handRankings);
    console.log(`[showdown] Winners: ${result.winners.map(w => w.playerId).join(', ')}`);

    // Broadcast result
    this.io.to(this.state.tableId).emit('game:hand-result', {
      winners: result.winners.map(w => ({
        playerId: w.playerId,
        amount: w.amount.toString(),
        hand: {
          rank: w.hand.rank,
          description: w.hand.description
        }
      })),
      pots: result.pots.map(p => ({
        amount: p.amount.toString(),
        winners: p.winners,
        type: p.type
      }))
    });

    // Schedule next hand
    this.state.phase = 'finished';
    console.log('[showdown] Scheduling next hand in 5 seconds...');
    setTimeout(() => {
      console.log('[showdown] Timer fired, starting new hand');
      this.startNewHand();
    }, 5000);
  }

  private endHandSingleWinner(): void {
    const winner = this.getActivePlayersInHand()[0];
    console.log(`[endHandSingleWinner] Winner: ${winner.username}, pot: ${this.state.pot}`);
    winner.chips += this.state.pot;

    this.io.to(this.state.tableId).emit('game:hand-result', {
      winners: [{
        playerId: winner.id,
        amount: this.state.pot.toString(),
        hand: { rank: 'high-card', description: 'Others folded' }
      }],
      pots: [{
        amount: this.state.pot.toString(),
        winners: [winner.id],
        type: 'main'
      }]
    });

    this.state.phase = 'finished';
    console.log('[endHandSingleWinner] Scheduling next hand in 3 seconds...');
    setTimeout(() => {
      console.log('[endHandSingleWinner] Timer fired, starting new hand');
      this.startNewHand();
    }, 3000);
  }

  private distributeWinnings(
    players: Player[],
    handRankings: Map<string, ReturnType<typeof findBestHand>>
  ): HandResult {
    const winners: WinnerInfo[] = [];
    const pots: { amount: bigint; winners: string[]; type: 'main' | 'side' }[] = [];

    // Sort players by their total bet (for side pot calculation)
    const sortedByBet = [...players].sort((a, b) =>
      a.totalBet < b.totalBet ? -1 : a.totalBet > b.totalBet ? 1 : 0
    );

    let remainingPot = this.state.pot;
    let processedBet = 0n;

    // Create pots and determine winners for each
    for (let i = 0; i < sortedByBet.length; i++) {
      const player = sortedByBet[i];
      const betLevel = player.totalBet;

      if (betLevel <= processedBet) continue;

      // Calculate this pot level
      const contributionPerPlayer = betLevel - processedBet;
      const eligiblePlayers = players.filter(p => p.totalBet >= betLevel);
      const potAmount = contributionPerPlayer * BigInt(eligiblePlayers.length);

      if (potAmount <= 0n) continue;

      // Find winners for this pot
      const potWinners = this.findWinners(eligiblePlayers, handRankings);
      const winAmount = potAmount / BigInt(potWinners.length);

      pots.push({
        amount: potAmount,
        winners: potWinners.map(p => p.id),
        type: i === 0 ? 'main' : 'side'
      });

      for (const winner of potWinners) {
        winner.chips += winAmount;
        const existing = winners.find(w => w.playerId === winner.id);
        if (existing) {
          existing.amount += winAmount;
        } else {
          winners.push({
            playerId: winner.id,
            amount: winAmount,
            hand: handRankings.get(winner.id)!
          });
        }
      }

      remainingPot -= potAmount;
      processedBet = betLevel;
    }

    return {
      winners,
      pots,
      handRankings
    };
  }

  private findWinners(
    players: Player[],
    handRankings: Map<string, ReturnType<typeof findBestHand>>
  ): Player[] {
    let bestPlayers: Player[] = [];
    let bestHand: ReturnType<typeof findBestHand> | null = null;

    for (const player of players) {
      const hand = handRankings.get(player.id)!;

      if (!bestHand) {
        bestHand = hand;
        bestPlayers = [player];
      } else {
        const comparison = compareHands(hand, bestHand);
        if (comparison > 0) {
          bestHand = hand;
          bestPlayers = [player];
        } else if (comparison === 0) {
          bestPlayers.push(player);
        }
      }
    }

    return bestPlayers;
  }

  // Helper Methods
  getValidActions(playerId: string): ActionType[] {
    const player = this.state.players.get(playerId);
    if (!player || player.isFolded || player.isAllIn) return [];

    const actions: ActionType[] = ['fold'];
    const toCall = this.state.currentBet - player.bet;

    if (toCall === 0n) {
      actions.push('check');
      if (player.chips > 0n) {
        actions.push('bet');
      }
    } else {
      if (player.chips >= toCall) {
        actions.push('call');
        if (player.chips > toCall) {
          actions.push('raise');
        }
      }
    }

    if (player.chips > 0n) {
      actions.push('all-in');
    }

    return actions;
  }

  isPlayerTurn(playerId: string): boolean {
    const player = this.state.players.get(playerId);
    return player?.seatNumber === this.state.currentPlayerSeat;
  }

  getCurrentPlayer(): Player | undefined {
    for (const player of this.state.players.values()) {
      if (player.seatNumber === this.state.currentPlayerSeat) {
        return player;
      }
    }
    return undefined;
  }

  getActivePlayers(): Player[] {
    return Array.from(this.state.players.values())
      .filter(p => p.isActive && p.chips > 0n);
  }

  getActivePlayersInHand(): Player[] {
    return Array.from(this.state.players.values())
      .filter(p => p.isActive && !p.isFolded);
  }

  getActivePlayersInSeatOrder(): Player[] {
    return this.getActivePlayers()
      .sort((a, b) => a.seatNumber - b.seatNumber);
  }

  getPlayerCount(): number {
    return this.state.players.size;
  }

  getState(): GameState {
    return this.state;
  }

  // Serialization
  serializeState(): SerializedGameState {
    return {
      tableId: this.state.tableId,
      config: {
        id: this.state.config.id,
        name: this.state.config.name,
        variant: this.state.config.variant,
        maxPlayers: this.state.config.maxPlayers,
        minPlayers: this.state.config.minPlayers,
        smallBlind: this.state.config.smallBlind.toString(),
        bigBlind: this.state.config.bigBlind.toString(),
        minBuyIn: this.state.config.minBuyIn.toString(),
        maxBuyIn: this.state.config.maxBuyIn.toString(),
        timeBank: this.state.config.timeBank,
        isPrivate: this.state.config.isPrivate
      },
      phase: this.state.phase,
      players: Array.from(this.state.players.values()).map(p => this.serializePlayer(p)),
      communityCards: this.state.communityCards.map(c => this.serializeCard(c)),
      pot: this.state.pot.toString(),
      sidePots: this.state.sidePots.map(sp => ({
        amount: sp.amount.toString(),
        eligiblePlayers: sp.eligiblePlayers
      })),
      currentBet: this.state.currentBet.toString(),
      dealerSeat: this.state.dealerSeat,
      currentPlayerSeat: this.state.currentPlayerSeat,
      handNumber: this.state.handNumber,
      turnStartTime: this.state.turnStartTime
    };
  }

  private serializePlayer(player: Player): SerializedPlayer {
    return {
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
      lastAction: player.lastAction ? {
        type: player.lastAction.type,
        amount: player.lastAction.amount.toString(),
        timestamp: player.lastAction.timestamp
      } : null,
      hasCards: player.cards.length > 0
    };
  }

  private serializeCard(card: Card): SerializedCard {
    return { suit: card.suit, rank: card.rank };
  }

  private broadcastState(): void {
    this.io.to(this.state.tableId).emit('game:state', this.serializeState());
  }

  private broadcastPlayerJoined(player: Player): void {
    this.io.to(this.state.tableId).emit('player:joined', this.serializePlayer(player));
  }

  // Find player by wallet address (for reconnection)
  findPlayerByWallet(walletAddress: string): Player | undefined {
    for (const player of this.state.players.values()) {
      if (player.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
        return player;
      }
    }
    return undefined;
  }

  // Mental Poker Methods

  /**
   * Initialize Mental Poker coordinator for a new hand
   * Called at the start of each hand when Mental Poker is enabled
   */
  initMentalPoker(): void {
    if (!this.mentalPokerEnabled) return;

    const playerOrder = this.getActivePlayersInSeatOrder().map(p => p.id);
    this.mentalPokerCoordinator = new MentalPokerCoordinator(this.state.tableId, playerOrder);
  }

  /**
   * Start Mental Poker commitment phase
   * Called after initMentalPoker to begin the shuffle protocol
   */
  startMentalPokerCommitmentPhase(): void {
    if (!this.mentalPokerCoordinator) return;

    this.mentalPokerCoordinator.startCommitmentPhase();

    // Notify all players to submit commitments
    this.io.to(this.state.tableId).emit('mental-poker:phase', {
      phase: 'commitment'
    });
  }

  /**
   * Receive a commitment from a player
   */
  receiveMentalPokerCommitment(playerId: string, commitment: string): boolean {
    if (!this.mentalPokerCoordinator) {
      console.log('Mental Poker not enabled or coordinator not initialized');
      return false;
    }

    const success = this.mentalPokerCoordinator.receiveCommitment(playerId, commitment);

    if (success) {
      // Notify all players about the commitment
      const state = this.mentalPokerCoordinator.getState();
      this.io.to(this.state.tableId).emit('mental-poker:commitment-received', {
        playerId,
        commitmentsReceived: state.commitments.size,
        totalPlayers: state.playerOrder.length
      });

      // Check if all commitments received - automatically moves to shuffle phase
      if (this.mentalPokerCoordinator.hasAllCommitments()) {
        // Notify about shuffle phase start
        const currentShuffler = this.mentalPokerCoordinator.getCurrentShuffler();
        this.io.to(this.state.tableId).emit('mental-poker:phase', {
          phase: 'shuffle',
          currentShuffler: currentShuffler || undefined
        });

        // Request first player to shuffle
        if (currentShuffler) {
          const socket = this.sockets.get(currentShuffler);
          if (socket) {
            socket.emit('mental-poker:shuffle-turn', {
              playerId: currentShuffler,
              encryptedDeck: this.mentalPokerCoordinator.getState().encryptedDeck
            });
          }
        }
      }
    }

    return success;
  }

  /**
   * Receive shuffled deck from a player
   */
  receiveMentalPokerShuffle(playerId: string, encryptedDeck: string[]): boolean {
    if (!this.mentalPokerCoordinator) {
      console.log('Mental Poker not enabled or coordinator not initialized');
      return false;
    }

    const success = this.mentalPokerCoordinator.receiveShuffleContribution(playerId, encryptedDeck);

    if (success) {
      const state = this.mentalPokerCoordinator.getState();
      const nextShuffler = this.mentalPokerCoordinator.getCurrentShuffler();

      if (nextShuffler) {
        // More players need to shuffle
        this.io.to(this.state.tableId).emit('mental-poker:phase', {
          phase: 'shuffle',
          currentShuffler: nextShuffler
        });

        // Request next player to shuffle
        const socket = this.sockets.get(nextShuffler);
        if (socket) {
          socket.emit('mental-poker:shuffle-turn', {
            playerId: nextShuffler,
            encryptedDeck: state.encryptedDeck
          });
        }
      } else {
        // All players have shuffled - notify about completion
        this.io.to(this.state.tableId).emit('mental-poker:shuffle-complete', {
          encryptedDeck: state.encryptedDeck
        });

        // Move to deal phase
        this.io.to(this.state.tableId).emit('mental-poker:phase', {
          phase: 'deal'
        });

        // Start dealing cards
        this.dealMentalPokerCards();
      }
    }

    return success;
  }

  /**
   * Deal cards using Mental Poker protocol
   */
  private dealMentalPokerCards(): void {
    if (!this.mentalPokerCoordinator) return;

    const players = this.getActivePlayersInSeatOrder();

    // Deal 2 hole cards to each player
    for (let cardNum = 0; cardNum < 2; cardNum++) {
      for (const player of players) {
        const request = this.mentalPokerCoordinator.requestHoleCard(player.id);
        if (request) {
          // Request key reveals from all other players
          this.requestKeyReveals(request.cardPosition, 'hole', player.id);
        }
      }
    }
  }

  /**
   * Request key reveals for a card
   */
  private requestKeyReveals(cardPosition: number, cardType: 'hole' | 'community', recipientId?: string): void {
    if (!this.mentalPokerCoordinator) return;

    const playersNeeded = this.mentalPokerCoordinator.getPlayersNeededForReveal(cardPosition);

    // Request from each player who needs to reveal
    for (const playerId of playersNeeded) {
      const socket = this.sockets.get(playerId);
      if (socket) {
        socket.emit('mental-poker:request-key', {
          cardPosition,
          cardType,
          recipientId
        });
      }
    }
  }

  /**
   * Receive a key reveal from a player
   */
  receiveMentalPokerKeyReveal(playerId: string, data: {
    cardPosition: number;
    decryptionKey: string;
    commitment: string;
    salt: string;
  }): boolean {
    if (!this.mentalPokerCoordinator) {
      console.log('Mental Poker not enabled or coordinator not initialized');
      return false;
    }

    const result = this.mentalPokerCoordinator.receiveKeyReveal({
      playerId,
      cardPosition: data.cardPosition,
      decryptionKey: data.decryptionKey,
      commitment: data.commitment,
      salt: data.salt,
      timestamp: Date.now()
    });

    // Notify about key reveal progress
    this.io.to(this.state.tableId).emit('mental-poker:key-revealed', {
      playerId,
      cardPosition: data.cardPosition,
      complete: result.complete,
      playersNeeded: result.playersNeeded
    });

    if (result.complete) {
      // Card is fully decryptable - notify the recipient
      const request = this.mentalPokerCoordinator.getState().revealRequests.get(data.cardPosition);
      if (request) {
        this.io.to(this.state.tableId).emit('mental-poker:card-revealed', {
          cardPosition: data.cardPosition,
          cardType: request.cardType,
          recipientId: request.recipientId
        });
      }
    }

    return true;
  }

  /**
   * Request community cards to be revealed (flop, turn, river)
   */
  revealCommunityCards(count: number): void {
    if (!this.mentalPokerCoordinator) return;

    for (let i = 0; i < count; i++) {
      const request = this.mentalPokerCoordinator.requestCommunityCard();
      if (request) {
        // Request key reveals from all players
        this.requestKeyReveals(request.cardPosition, 'community');
      }
    }
  }

  /**
   * Enable/disable Mental Poker for this table
   */
  setMentalPokerEnabled(enabled: boolean): void {
    this.mentalPokerEnabled = enabled;
    console.log(`Mental Poker ${enabled ? 'enabled' : 'disabled'} for table ${this.state.tableId}`);
  }

  /**
   * Check if Mental Poker is enabled
   */
  isMentalPokerEnabled(): boolean {
    return this.mentalPokerEnabled;
  }

  // Cleanup
  destroy(): void {
    this.clearTurnTimer();
    if (this.gameLoopTimer) {
      clearTimeout(this.gameLoopTimer);
    }
    // Clear all disconnect timers
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.sockets.clear();
    this.state.players.clear();
  }
}
