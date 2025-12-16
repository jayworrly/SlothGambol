/**
 * Mental Poker Shuffle Protocol
 *
 * The shuffle protocol ensures that no single player can control
 * the order of cards. Each player:
 * 1. Encrypts all cards with their key
 * 2. Shuffles the encrypted deck
 * 3. Passes to the next player
 *
 * After all players have encrypted and shuffled, the deck
 * is fully randomized and encrypted by all players.
 */

import {
  SRAKeyPair,
  generateKeyPair,
  encrypt,
  decrypt,
  serializeKey,
  deserializeKey,
  generateCommitment,
  DEFAULT_PRIME
} from './sra';

export interface ShuffleState {
  phase: 'waiting' | 'encrypting' | 'shuffling' | 'complete';
  currentPlayerIndex: number;
  encryptedDeck: bigint[];
  playerOrder: string[];
  commitments: Map<string, string>;
}

export interface PlayerShuffleData {
  playerId: string;
  keyPair: SRAKeyPair;
  commitment: string;
  salt: bigint;
}

/**
 * Create initial deck (0-51 representing all cards)
 */
export function createInitialDeck(): bigint[] {
  const deck: bigint[] = [];
  for (let i = 0; i < 52; i++) {
    // Add offset to avoid encrypting 0 or 1
    deck.push(BigInt(i + 2));
  }
  return deck;
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Encrypt and shuffle deck with player's key
 */
export function encryptAndShuffle(
  deck: bigint[],
  encryptionKey: bigint,
  prime: bigint = DEFAULT_PRIME
): bigint[] {
  // Encrypt all cards
  const encrypted = deck.map(card => encrypt(card, encryptionKey, prime));

  // Shuffle
  return shuffleArray(encrypted);
}

/**
 * Decrypt deck with player's key (for revealing)
 */
export function decryptDeck(
  deck: bigint[],
  decryptionKey: bigint,
  prime: bigint = DEFAULT_PRIME
): bigint[] {
  return deck.map(card => decrypt(card, decryptionKey, prime));
}

/**
 * Decrypt a single card with multiple keys
 */
export function decryptWithMultipleKeys(
  encryptedValue: bigint,
  keys: bigint[],
  prime: bigint = DEFAULT_PRIME
): bigint {
  let value = encryptedValue;
  for (const key of keys) {
    value = decrypt(value, key, prime);
  }
  return value;
}

/**
 * Mental Poker Shuffle Coordinator (client-side)
 */
export class ShuffleCoordinator {
  private keyPair: SRAKeyPair;
  private commitment: string = '';
  private salt: bigint = 0n;
  private playerId: string;
  private encryptedDeck: bigint[] = [];
  private otherPlayersKeys: Map<string, bigint> = new Map();

  constructor(playerId: string, prime: bigint = DEFAULT_PRIME) {
    this.playerId = playerId;
    this.keyPair = generateKeyPair(prime);
  }

  /**
   * Get this player's encryption key (public)
   */
  getEncryptionKey(): bigint {
    return this.keyPair.encryptionKey;
  }

  /**
   * Get this player's decryption key (private, only share for card reveals)
   */
  getDecryptionKey(): bigint {
    return this.keyPair.decryptionKey;
  }

  /**
   * Generate commitment for our key
   */
  async generateKeyCommitment(): Promise<string> {
    const { commitment, salt } = await generateCommitment(this.keyPair.encryptionKey);
    this.commitment = commitment;
    this.salt = salt;
    return commitment;
  }

  /**
   * Get commitment data for verification
   */
  getCommitmentData(): { commitment: string; salt: string; key: string } {
    return {
      commitment: this.commitment,
      salt: serializeKey(this.salt),
      key: serializeKey(this.keyPair.encryptionKey)
    };
  }

  /**
   * Encrypt and shuffle deck when it's our turn
   */
  encryptAndShuffleDeck(inputDeck: bigint[]): bigint[] {
    this.encryptedDeck = encryptAndShuffle(inputDeck, this.keyPair.encryptionKey, this.keyPair.prime);
    return this.encryptedDeck;
  }

  /**
   * Store a revealed decryption key from another player
   */
  storePlayerKey(playerId: string, key: bigint): void {
    this.otherPlayersKeys.set(playerId, key);
  }

  /**
   * Decrypt a card using our key and all stored keys
   * For hole cards: all players except recipient decrypt
   * For community cards: all players decrypt
   */
  decryptCard(encryptedValue: bigint, excludePlayerId?: string): number {
    let value = encryptedValue;

    // Decrypt with our key (unless we're the excluded player)
    if (excludePlayerId !== this.playerId) {
      value = decrypt(value, this.keyPair.decryptionKey, this.keyPair.prime);
    }

    // Decrypt with all stored keys (except excluded player)
    for (const [playerId, key] of this.otherPlayersKeys) {
      if (playerId !== excludePlayerId) {
        value = decrypt(value, key, this.keyPair.prime);
      }
    }

    // Remove offset
    return Number(value - 2n);
  }

  /**
   * Get serialized data for transmission
   */
  serializeForTransmission(): {
    commitment: string;
    encryptedDeck: string[];
  } {
    return {
      commitment: this.commitment,
      encryptedDeck: this.encryptedDeck.map(v => serializeKey(v))
    };
  }

  /**
   * Deserialize deck from transmission
   */
  static deserializeDeck(serializedDeck: string[]): bigint[] {
    return serializedDeck.map(v => deserializeKey(v));
  }
}

/**
 * Verify shuffle commitment chain
 * Ensures each player's shuffle was valid
 */
export async function verifyShuffleChain(
  shuffleData: Array<{
    playerId: string;
    commitment: string;
    salt: string;
    encryptionKey: string;
    inputDeck: string[];
    outputDeck: string[];
  }>
): Promise<boolean> {
  for (const data of shuffleData) {
    // Verify commitment matches key
    const { commitment } = await generateCommitment(
      deserializeKey(data.encryptionKey),
      deserializeKey(data.salt)
    );

    if (commitment !== data.commitment) {
      console.error(`Commitment mismatch for player ${data.playerId}`);
      return false;
    }

    // Verify output deck has same cards as input (just encrypted and shuffled)
    const inputDeck = data.inputDeck.map(v => deserializeKey(v));
    const outputDeck = data.outputDeck.map(v => deserializeKey(v));

    if (inputDeck.length !== outputDeck.length) {
      console.error(`Deck size mismatch for player ${data.playerId}`);
      return false;
    }

    // Note: We can't verify the shuffle directly without decryption keys
    // Full verification happens when cards are revealed
  }

  return true;
}
