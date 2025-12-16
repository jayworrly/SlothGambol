/**
 * Mental Poker Server Coordinator
 *
 * The server coordinates the Mental Poker protocol but never has access
 * to the decryption keys. It acts as a relay for the protocol messages
 * and maintains state for verification.
 */

export interface ShuffleCommitment {
  playerId: string;
  commitment: string;
  timestamp: number;
}

export interface ShuffleContribution {
  playerId: string;
  encryptedDeck: string[];
  timestamp: number;
}

export interface KeyReveal {
  playerId: string;
  cardPosition: number;
  decryptionKey: string;
  commitment: string;
  salt: string;
  timestamp: number;
}

export interface CardRevealRequest {
  cardPosition: number;
  cardType: 'hole' | 'community';
  recipientId?: string;
  requestedBy: string;
  timestamp: number;
}

export type MentalPokerPhase =
  | 'waiting'           // Waiting for enough players
  | 'commitment'        // Players submitting commitments
  | 'shuffle'           // Players taking turns to shuffle
  | 'deal'              // Cards being dealt
  | 'play'              // Normal gameplay
  | 'complete';         // Hand finished

export interface MentalPokerState {
  phase: MentalPokerPhase;
  playerOrder: string[];
  currentShufflerIndex: number;
  commitments: Map<string, ShuffleCommitment>;
  shuffleContributions: ShuffleContribution[];
  encryptedDeck: string[];
  revealRequests: Map<number, CardRevealRequest>;
  keyReveals: Map<number, KeyReveal[]>; // cardPosition -> reveals
  dealtCards: Map<number, { playerId?: string; type: 'hole' | 'community' }>;
  nextCardPosition: number;
}

/**
 * Mental Poker Protocol Coordinator
 *
 * Manages the Mental Poker protocol for a single hand
 */
export class MentalPokerCoordinator {
  private state: MentalPokerState;
  public readonly tableId: string;

  constructor(tableId: string, playerOrder: string[]) {
    this.tableId = tableId;
    this.state = {
      phase: 'waiting',
      playerOrder,
      currentShufflerIndex: 0,
      commitments: new Map(),
      shuffleContributions: [],
      encryptedDeck: [],
      revealRequests: new Map(),
      keyReveals: new Map(),
      dealtCards: new Map(),
      nextCardPosition: 0
    };
  }

  /**
   * Get current phase
   */
  getPhase(): MentalPokerPhase {
    return this.state.phase;
  }

  /**
   * Get current state for serialization
   */
  getState(): MentalPokerState {
    return this.state;
  }

  /**
   * Start the commitment phase
   */
  startCommitmentPhase(): void {
    this.state.phase = 'commitment';
    this.state.commitments.clear();
  }

  /**
   * Receive a commitment from a player
   */
  receiveCommitment(playerId: string, commitment: string): boolean {
    if (this.state.phase !== 'commitment') {
      return false;
    }

    if (!this.state.playerOrder.includes(playerId)) {
      return false;
    }

    this.state.commitments.set(playerId, {
      playerId,
      commitment,
      timestamp: Date.now()
    });

    // Check if all commitments received
    if (this.state.commitments.size === this.state.playerOrder.length) {
      this.startShufflePhase();
    }

    return true;
  }

  /**
   * Check if all commitments are received
   */
  hasAllCommitments(): boolean {
    return this.state.commitments.size === this.state.playerOrder.length;
  }

  /**
   * Start the shuffle phase
   */
  private startShufflePhase(): void {
    this.state.phase = 'shuffle';
    this.state.currentShufflerIndex = 0;
    this.state.shuffleContributions = [];

    // Initialize deck with card indices (0-51)
    this.state.encryptedDeck = Array.from({ length: 52 }, (_, i) => (i + 2).toString());
  }

  /**
   * Get the current player who should shuffle
   */
  getCurrentShuffler(): string | null {
    if (this.state.phase !== 'shuffle') {
      return null;
    }
    return this.state.playerOrder[this.state.currentShufflerIndex];
  }

  /**
   * Receive a shuffle contribution from a player
   */
  receiveShuffleContribution(playerId: string, encryptedDeck: string[]): boolean {
    if (this.state.phase !== 'shuffle') {
      return false;
    }

    const expectedPlayer = this.getCurrentShuffler();
    if (playerId !== expectedPlayer) {
      return false;
    }

    if (encryptedDeck.length !== 52) {
      return false;
    }

    this.state.shuffleContributions.push({
      playerId,
      encryptedDeck,
      timestamp: Date.now()
    });

    this.state.encryptedDeck = encryptedDeck;
    this.state.currentShufflerIndex++;

    // Check if all players have shuffled
    if (this.state.currentShufflerIndex >= this.state.playerOrder.length) {
      this.startDealPhase();
    }

    return true;
  }

  /**
   * Start the deal phase
   */
  private startDealPhase(): void {
    this.state.phase = 'deal';
    this.state.nextCardPosition = 0;
  }

  /**
   * Request to deal a hole card
   */
  requestHoleCard(recipientId: string): CardRevealRequest | null {
    if (this.state.phase !== 'deal' && this.state.phase !== 'play') {
      return null;
    }

    const cardPosition = this.state.nextCardPosition++;
    const request: CardRevealRequest = {
      cardPosition,
      cardType: 'hole',
      recipientId,
      requestedBy: 'dealer',
      timestamp: Date.now()
    };

    this.state.revealRequests.set(cardPosition, request);
    this.state.dealtCards.set(cardPosition, { playerId: recipientId, type: 'hole' });
    this.state.keyReveals.set(cardPosition, []);

    return request;
  }

  /**
   * Request to deal a community card
   */
  requestCommunityCard(): CardRevealRequest | null {
    if (this.state.phase !== 'deal' && this.state.phase !== 'play') {
      return null;
    }

    const cardPosition = this.state.nextCardPosition++;
    const request: CardRevealRequest = {
      cardPosition,
      cardType: 'community',
      requestedBy: 'dealer',
      timestamp: Date.now()
    };

    this.state.revealRequests.set(cardPosition, request);
    this.state.dealtCards.set(cardPosition, { type: 'community' });
    this.state.keyReveals.set(cardPosition, []);

    return request;
  }

  /**
   * Receive a key reveal from a player
   */
  receiveKeyReveal(reveal: KeyReveal): { complete: boolean; playersNeeded: string[] } {
    const request = this.state.revealRequests.get(reveal.cardPosition);
    if (!request) {
      return { complete: false, playersNeeded: [] };
    }

    // Store the reveal
    const reveals = this.state.keyReveals.get(reveal.cardPosition) || [];

    // Check for duplicate
    if (reveals.some(r => r.playerId === reveal.playerId)) {
      return { complete: false, playersNeeded: this.getPlayersNeededForReveal(reveal.cardPosition) };
    }

    reveals.push({
      ...reveal,
      timestamp: Date.now()
    });
    this.state.keyReveals.set(reveal.cardPosition, reveals);

    // Check if we have all needed keys
    const playersNeeded = this.getPlayersNeededForReveal(reveal.cardPosition);
    const complete = playersNeeded.length === 0;

    return { complete, playersNeeded };
  }

  /**
   * Get list of players who still need to reveal keys for a card
   */
  getPlayersNeededForReveal(cardPosition: number): string[] {
    const request = this.state.revealRequests.get(cardPosition);
    if (!request) {
      return [];
    }

    const reveals = this.state.keyReveals.get(cardPosition) || [];
    const revealedPlayers = new Set(reveals.map(r => r.playerId));

    return this.state.playerOrder.filter(playerId => {
      // For hole cards, recipient doesn't reveal
      if (request.cardType === 'hole' && playerId === request.recipientId) {
        return false;
      }
      return !revealedPlayers.has(playerId);
    });
  }

  /**
   * Get all key reveals for a card
   */
  getKeyReveals(cardPosition: number): KeyReveal[] {
    return this.state.keyReveals.get(cardPosition) || [];
  }

  /**
   * Get the encrypted value for a card
   */
  getEncryptedCard(cardPosition: number): string | null {
    if (cardPosition >= this.state.encryptedDeck.length) {
      return null;
    }
    return this.state.encryptedDeck[cardPosition];
  }

  /**
   * Check if a card reveal is complete
   */
  isRevealComplete(cardPosition: number): boolean {
    return this.getPlayersNeededForReveal(cardPosition).length === 0;
  }

  /**
   * Start gameplay phase
   */
  startPlayPhase(): void {
    this.state.phase = 'play';
  }

  /**
   * Complete the hand
   */
  complete(): void {
    this.state.phase = 'complete';
  }

  /**
   * Reset for a new hand
   */
  reset(playerOrder: string[]): void {
    this.state = {
      phase: 'waiting',
      playerOrder,
      currentShufflerIndex: 0,
      commitments: new Map(),
      shuffleContributions: [],
      encryptedDeck: [],
      revealRequests: new Map(),
      keyReveals: new Map(),
      dealtCards: new Map(),
      nextCardPosition: 0
    };
  }

  /**
   * Serialize state for transmission
   */
  serialize(): {
    phase: MentalPokerPhase;
    playerOrder: string[];
    currentShuffler: string | null;
    encryptedDeck: string[];
    commitmentCount: number;
    shuffleContributionCount: number;
  } {
    return {
      phase: this.state.phase,
      playerOrder: this.state.playerOrder,
      currentShuffler: this.getCurrentShuffler(),
      encryptedDeck: this.state.encryptedDeck,
      commitmentCount: this.state.commitments.size,
      shuffleContributionCount: this.state.shuffleContributions.length
    };
  }
}
