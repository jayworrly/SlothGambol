/**
 * Mental Poker Card Reveal Protocol
 *
 * Cards are revealed by having players share their decryption keys.
 *
 * For HOLE CARDS (private):
 * - All players EXCEPT the recipient share their decryption keys
 * - Only the recipient can see the final card
 *
 * For COMMUNITY CARDS (public):
 * - ALL players share their decryption keys
 * - Everyone can see the final card
 */

import {
  decrypt,
  indexToCard,
  serializeKey,
  deserializeKey,
  generateCommitment,
  verifyCommitment,
  DEFAULT_PRIME
} from './sra';

export interface CardRevealRequest {
  cardPosition: number;       // Index in the encrypted deck
  cardType: 'hole' | 'community';
  recipientId?: string;       // Only for hole cards
  requestingPlayerId: string;
}

export interface KeyReveal {
  playerId: string;
  cardPosition: number;
  decryptionKey: string;      // Serialized bigint
  commitment: string;         // Hash commitment for verification
  salt: string;               // Salt for commitment verification
}

export interface RevealedCard {
  cardPosition: number;
  cardIndex: number;          // 0-51
  card: { suit: string; rank: string };
  revealedBy: string[];       // Players who revealed their keys
  encryptedValue: string;     // Original encrypted value for verification
}

/**
 * Card Reveal Coordinator
 * Manages the card reveal process for a single player
 */
export class RevealCoordinator {
  private playerId: string;
  private decryptionKey: bigint;
  private prime: bigint;
  private revealedKeys: Map<string, Map<number, bigint>> = new Map(); // playerId -> (cardPosition -> key)
  private cardCommitments: Map<number, { commitment: string; salt: bigint }> = new Map();

  constructor(playerId: string, decryptionKey: bigint, prime: bigint = DEFAULT_PRIME) {
    this.playerId = playerId;
    this.decryptionKey = decryptionKey;
    this.prime = prime;
  }

  /**
   * Generate a key reveal for a specific card
   */
  async generateKeyReveal(cardPosition: number): Promise<KeyReveal> {
    const { commitment, salt } = await generateCommitment(this.decryptionKey);

    // Store our commitment
    this.cardCommitments.set(cardPosition, { commitment, salt });

    return {
      playerId: this.playerId,
      cardPosition,
      decryptionKey: serializeKey(this.decryptionKey),
      commitment,
      salt: serializeKey(salt)
    };
  }

  /**
   * Store a key reveal from another player
   */
  async storeKeyReveal(reveal: KeyReveal): Promise<boolean> {
    // Verify commitment
    const isValid = await verifyCommitment(
      deserializeKey(reveal.decryptionKey),
      deserializeKey(reveal.salt),
      reveal.commitment
    );

    if (!isValid) {
      console.error(`Invalid commitment from player ${reveal.playerId}`);
      return false;
    }

    // Store the key
    if (!this.revealedKeys.has(reveal.playerId)) {
      this.revealedKeys.set(reveal.playerId, new Map());
    }
    this.revealedKeys.get(reveal.playerId)!.set(
      reveal.cardPosition,
      deserializeKey(reveal.decryptionKey)
    );

    return true;
  }

  /**
   * Try to decrypt a card using all available keys
   * Returns null if not enough keys have been revealed
   */
  tryDecryptCard(
    encryptedValue: bigint,
    cardPosition: number,
    requiredPlayers: string[],
    excludePlayer?: string
  ): number | null {
    const keysToUse: bigint[] = [];
    const missingPlayers: string[] = [];

    for (const playerId of requiredPlayers) {
      if (playerId === excludePlayer) {
        continue; // Skip excluded player for hole cards
      }

      if (playerId === this.playerId) {
        keysToUse.push(this.decryptionKey);
      } else {
        const playerKeys = this.revealedKeys.get(playerId);
        const key = playerKeys?.get(cardPosition);

        if (key) {
          keysToUse.push(key);
        } else {
          missingPlayers.push(playerId);
        }
      }
    }

    if (missingPlayers.length > 0) {
      console.log(`Waiting for keys from: ${missingPlayers.join(', ')}`);
      return null;
    }

    // Decrypt with all keys
    let value = encryptedValue;
    for (const key of keysToUse) {
      value = decrypt(value, key, this.prime);
    }

    // Remove offset and return card index
    return Number(value - 2n);
  }

  /**
   * Get all keys for a specific card position (for broadcasting)
   */
  getKeysForCard(cardPosition: number): Map<string, bigint> {
    const keys = new Map<string, bigint>();

    // Add our key
    keys.set(this.playerId, this.decryptionKey);

    // Add all revealed keys for this position
    for (const [playerId, playerKeys] of this.revealedKeys) {
      const key = playerKeys.get(cardPosition);
      if (key) {
        keys.set(playerId, key);
      }
    }

    return keys;
  }

  /**
   * Check if we have all required keys for a card
   */
  hasAllKeys(cardPosition: number, requiredPlayers: string[], excludePlayer?: string): boolean {
    for (const playerId of requiredPlayers) {
      if (playerId === excludePlayer) continue;
      if (playerId === this.playerId) continue;

      const playerKeys = this.revealedKeys.get(playerId);
      if (!playerKeys?.has(cardPosition)) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Reveal Manager - coordinates card reveals across all players
 */
export class RevealManager {
  private encryptedDeck: bigint[];
  private players: string[];
  private revealCoordinator: RevealCoordinator;
  private revealedCards: Map<number, RevealedCard> = new Map();
  private pendingReveals: Map<number, CardRevealRequest> = new Map();

  constructor(
    encryptedDeck: bigint[],
    players: string[],
    playerId: string,
    decryptionKey: bigint,
    prime: bigint = DEFAULT_PRIME
  ) {
    this.encryptedDeck = encryptedDeck;
    this.players = players;
    this.revealCoordinator = new RevealCoordinator(playerId, decryptionKey, prime);
  }

  /**
   * Request to reveal a card
   */
  requestCardReveal(
    cardPosition: number,
    cardType: 'hole' | 'community',
    recipientId?: string
  ): CardRevealRequest {
    const request: CardRevealRequest = {
      cardPosition,
      cardType,
      recipientId,
      requestingPlayerId: this.players[0] // Dealer typically requests
    };

    this.pendingReveals.set(cardPosition, request);
    return request;
  }

  /**
   * Generate our key reveal for a pending card
   */
  async generateOurKeyReveal(cardPosition: number): Promise<KeyReveal | null> {
    const request = this.pendingReveals.get(cardPosition);
    if (!request) {
      return null;
    }

    // For hole cards, don't reveal if we're the recipient
    if (request.cardType === 'hole' && request.recipientId === this.players[0]) {
      return null;
    }

    return this.revealCoordinator.generateKeyReveal(cardPosition);
  }

  /**
   * Process a key reveal from another player
   */
  async processKeyReveal(reveal: KeyReveal): Promise<RevealedCard | null> {
    const success = await this.revealCoordinator.storeKeyReveal(reveal);
    if (!success) {
      return null;
    }

    // Try to decrypt if we have all keys
    return this.tryDecryptCard(reveal.cardPosition);
  }

  /**
   * Try to decrypt a card if we have all required keys
   */
  private tryDecryptCard(cardPosition: number): RevealedCard | null {
    const request = this.pendingReveals.get(cardPosition);
    if (!request) {
      return null;
    }

    const excludePlayer = request.cardType === 'hole' ? request.recipientId : undefined;

    // Check if we have all keys
    if (!this.revealCoordinator.hasAllKeys(cardPosition, this.players, excludePlayer)) {
      return null;
    }

    // Decrypt
    const encryptedValue = this.encryptedDeck[cardPosition];
    const cardIndex = this.revealCoordinator.tryDecryptCard(
      encryptedValue,
      cardPosition,
      this.players,
      excludePlayer
    );

    if (cardIndex === null) {
      return null;
    }

    const card = indexToCard(cardIndex);
    const revealedCard: RevealedCard = {
      cardPosition,
      cardIndex,
      card,
      revealedBy: this.players.filter(p => p !== excludePlayer),
      encryptedValue: serializeKey(encryptedValue)
    };

    this.revealedCards.set(cardPosition, revealedCard);
    this.pendingReveals.delete(cardPosition);

    return revealedCard;
  }

  /**
   * Get all revealed cards
   */
  getRevealedCards(): Map<number, RevealedCard> {
    return this.revealedCards;
  }

  /**
   * Get a specific revealed card
   */
  getRevealedCard(cardPosition: number): RevealedCard | undefined {
    return this.revealedCards.get(cardPosition);
  }
}

/**
 * Verify that a revealed card is correct
 * Used for dispute resolution
 */
export async function verifyCardReveal(
  encryptedValue: bigint,
  expectedCardIndex: number,
  keyReveals: KeyReveal[],
  prime: bigint = DEFAULT_PRIME
): Promise<{ valid: boolean; error?: string }> {
  // Verify all commitments
  for (const reveal of keyReveals) {
    const isValid = await verifyCommitment(
      deserializeKey(reveal.decryptionKey),
      deserializeKey(reveal.salt),
      reveal.commitment
    );

    if (!isValid) {
      return {
        valid: false,
        error: `Invalid commitment from player ${reveal.playerId}`
      };
    }
  }

  // Decrypt with all keys
  let value = encryptedValue;
  for (const reveal of keyReveals) {
    value = decrypt(value, deserializeKey(reveal.decryptionKey), prime);
  }

  // Check if result matches expected
  const actualCardIndex = Number(value - 2n);
  if (actualCardIndex !== expectedCardIndex) {
    return {
      valid: false,
      error: `Card mismatch: expected ${expectedCardIndex}, got ${actualCardIndex}`
    };
  }

  return { valid: true };
}
