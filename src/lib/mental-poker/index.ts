/**
 * Mental Poker Protocol
 *
 * A trustless card dealing system using SRA commutative encryption.
 *
 * Key concepts:
 * - All players encrypt the deck with their keys
 * - Cards are revealed by sharing decryption keys
 * - Commitments provide proof for dispute resolution
 *
 * Usage:
 * 1. Each player generates a key pair
 * 2. Players take turns encrypting and shuffling the deck
 * 3. Cards are dealt by having players reveal their keys
 * 4. Commitments are stored for verification
 */

// Type exports
export type { SRAKeyPair, EncryptedCard } from './sra';
export type { ShuffleState, PlayerShuffleData } from './shuffle';
export type { CardRevealRequest, KeyReveal, RevealedCard } from './reveal';

// SRA encryption
export {
  DEFAULT_PRIME,
  generateKeyPair,
  encrypt,
  decrypt,
  encryptCard,
  decryptCard,
  modPow,
  modInverse,
  indexToCard,
  cardToIndex,
  serializeKey,
  deserializeKey,
  generateCommitment,
  verifyCommitment
} from './sra';

// Shuffle protocol
export {
  createInitialDeck,
  shuffleArray,
  encryptAndShuffle,
  decryptDeck,
  decryptWithMultipleKeys,
  ShuffleCoordinator,
  verifyShuffleChain
} from './shuffle';

// Reveal protocol
export {
  RevealCoordinator,
  RevealManager,
  verifyCardReveal
} from './reveal';

/**
 * Mental Poker Game Coordinator
 *
 * High-level coordinator that manages the entire Mental Poker protocol
 * for a single game session.
 */
export class MentalPokerGame {
  private playerId: string;
  private shuffleCoordinator: import('./shuffle').ShuffleCoordinator;
  private revealManager: import('./reveal').RevealManager | null = null;
  private allPlayers: string[] = [];
  private encryptedDeck: bigint[] = [];
  private phase: 'init' | 'shuffle' | 'deal' | 'play' | 'complete' = 'init';

  constructor(playerId: string, prime?: bigint) {
    this.playerId = playerId;
    // Dynamic import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ShuffleCoordinator } = require('./shuffle');
    this.shuffleCoordinator = new ShuffleCoordinator(playerId, prime);
  }

  /**
   * Get current phase
   */
  getPhase(): string {
    return this.phase;
  }

  /**
   * Set all players in the game
   */
  setPlayers(players: string[]): void {
    this.allPlayers = players;
  }

  /**
   * Generate commitment for shuffle protocol
   */
  async generateShuffleCommitment(): Promise<string> {
    return this.shuffleCoordinator.generateKeyCommitment();
  }

  /**
   * Process our turn in the shuffle
   */
  processShuffleTurn(inputDeck: bigint[]): bigint[] {
    this.phase = 'shuffle';
    return this.shuffleCoordinator.encryptAndShuffleDeck(inputDeck);
  }

  /**
   * Finalize deck after all players have shuffled
   */
  finalizeDeck(finalDeck: bigint[]): void {
    this.encryptedDeck = finalDeck;
    this.phase = 'deal';

    // Initialize reveal manager
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RevealManager } = require('./reveal');
    this.revealManager = new RevealManager(
      this.encryptedDeck,
      this.allPlayers,
      this.playerId,
      this.shuffleCoordinator.getDecryptionKey()
    );
  }

  /**
   * Store another player's decryption key
   */
  storePlayerKey(playerId: string, key: bigint): void {
    this.shuffleCoordinator.storePlayerKey(playerId, key);
  }

  /**
   * Request to reveal a hole card (private to recipient)
   */
  requestHoleCard(cardPosition: number, recipientId: string) {
    if (!this.revealManager) {
      throw new Error('Deck not finalized');
    }
    return this.revealManager.requestCardReveal(cardPosition, 'hole', recipientId);
  }

  /**
   * Request to reveal a community card (public)
   */
  requestCommunityCard(cardPosition: number) {
    if (!this.revealManager) {
      throw new Error('Deck not finalized');
    }
    return this.revealManager.requestCardReveal(cardPosition, 'community');
  }

  /**
   * Generate our key reveal for a card
   */
  async generateKeyReveal(cardPosition: number) {
    if (!this.revealManager) {
      throw new Error('Deck not finalized');
    }
    return this.revealManager.generateOurKeyReveal(cardPosition);
  }

  /**
   * Process a key reveal from another player
   */
  async processKeyReveal(reveal: import('./reveal').KeyReveal) {
    if (!this.revealManager) {
      throw new Error('Deck not finalized');
    }
    return this.revealManager.processKeyReveal(reveal);
  }

  /**
   * Get revealed card at position
   */
  getRevealedCard(cardPosition: number) {
    return this.revealManager?.getRevealedCard(cardPosition);
  }

  /**
   * Get all revealed cards
   */
  getAllRevealedCards() {
    return this.revealManager?.getRevealedCards() ?? new Map();
  }

  /**
   * Get encrypted deck
   */
  getEncryptedDeck(): bigint[] {
    return this.encryptedDeck;
  }

  /**
   * Get our decryption key (for revealing cards)
   */
  getDecryptionKey(): bigint {
    return this.shuffleCoordinator.getDecryptionKey();
  }

  /**
   * Get serialized commitment data
   */
  getCommitmentData() {
    return this.shuffleCoordinator.getCommitmentData();
  }

  /**
   * Mark game as complete
   */
  complete(): void {
    this.phase = 'complete';
  }
}
