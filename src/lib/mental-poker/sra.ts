/**
 * SRA Commutative Encryption for Mental Poker
 *
 * SRA is a commutative encryption scheme where:
 * - E_A(E_B(x)) = E_B(E_A(x))  (commutative)
 * - D_A(D_B(E_A(E_B(x)))) = x  (can decrypt in any order)
 *
 * This allows trustless card dealing where all players encrypt
 * the deck, and cards are revealed by sharing decryption keys.
 */

// Large prime for the encryption (shared by all players)
// In production, this should be agreed upon or generated collaboratively
export const DEFAULT_PRIME = BigInt(
  "0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF"
);

export interface SRAKeyPair {
  encryptionKey: bigint;  // e
  decryptionKey: bigint;  // d
  prime: bigint;          // p (shared)
}

export interface EncryptedCard {
  value: bigint;
  cardIndex: number;
}

/**
 * Generate a random bigint of specified bit length
 */
function randomBigInt(bits: number): bigint {
  const bytes = Math.ceil(bits / 8);
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);

  let result = 0n;
  for (let i = 0; i < array.length; i++) {
    result = (result << 8n) | BigInt(array[i]);
  }

  // Mask to exact bit length
  const mask = (1n << BigInt(bits)) - 1n;
  return result & mask;
}

/**
 * Modular exponentiation: (base^exp) mod mod
 * Uses square-and-multiply for efficiency
 */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;

  let result = 1n;
  base = base % mod;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp >> 1n;
    base = (base * base) % mod;
  }

  return result;
}

/**
 * Extended Euclidean Algorithm
 * Returns [gcd, x, y] where ax + by = gcd(a, b)
 */
function extendedGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (a === 0n) {
    return [b, 0n, 1n];
  }

  const [gcd, x1, y1] = extendedGcd(b % a, a);
  const x = y1 - (b / a) * x1;
  const y = x1;

  return [gcd, x, y];
}

/**
 * Modular multiplicative inverse
 * Returns x such that (a * x) mod m = 1
 */
export function modInverse(a: bigint, m: bigint): bigint {
  const [gcd, x] = extendedGcd(a % m, m);

  if (gcd !== 1n) {
    throw new Error("Modular inverse does not exist");
  }

  return ((x % m) + m) % m;
}

/**
 * Greatest common divisor
 */
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Generate SRA key pair
 * The encryption and decryption keys must satisfy: e * d ≡ 1 (mod p-1)
 */
export function generateKeyPair(prime: bigint = DEFAULT_PRIME): SRAKeyPair {
  const phi = prime - 1n;

  // Generate random encryption key that is coprime to phi
  let e: bigint;
  do {
    e = randomBigInt(256);
    // Ensure e is odd and in valid range
    e = e | 1n;
    if (e >= phi) {
      e = e % (phi - 2n) + 2n;
    }
  } while (gcd(e, phi) !== 1n || e < 2n);

  // Calculate decryption key: d = e^(-1) mod phi
  const d = modInverse(e, phi);

  return {
    encryptionKey: e,
    decryptionKey: d,
    prime
  };
}

/**
 * Encrypt a value using SRA
 * E(m) = m^e mod p
 */
export function encrypt(message: bigint, key: bigint, prime: bigint = DEFAULT_PRIME): bigint {
  return modPow(message, key, prime);
}

/**
 * Decrypt a value using SRA
 * D(c) = c^d mod p
 */
export function decrypt(ciphertext: bigint, key: bigint, prime: bigint = DEFAULT_PRIME): bigint {
  return modPow(ciphertext, key, prime);
}

/**
 * Encrypt a card (represented as a number 0-51)
 */
export function encryptCard(
  cardIndex: number,
  encryptionKey: bigint,
  prime: bigint = DEFAULT_PRIME
): EncryptedCard {
  // Add offset to avoid encrypting 0 or 1 (which don't change)
  const cardValue = BigInt(cardIndex + 2);
  const encrypted = encrypt(cardValue, encryptionKey, prime);

  return {
    value: encrypted,
    cardIndex
  };
}

/**
 * Decrypt a card
 */
export function decryptCard(
  encryptedValue: bigint,
  decryptionKey: bigint,
  prime: bigint = DEFAULT_PRIME
): number {
  const decrypted = decrypt(encryptedValue, decryptionKey, prime);
  // Remove offset
  return Number(decrypted - 2n);
}

/**
 * Convert card index (0-51) to card representation
 */
export function indexToCard(index: number): { suit: string; rank: string } {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const suitIndex = Math.floor(index / 13);
  const rankIndex = index % 13;

  return {
    suit: suits[suitIndex],
    rank: ranks[rankIndex]
  };
}

/**
 * Convert card to index (0-51)
 */
export function cardToIndex(suit: string, rank: string): number {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const suitIndex = suits.indexOf(suit);
  const rankIndex = ranks.indexOf(rank);

  if (suitIndex === -1 || rankIndex === -1) {
    throw new Error(`Invalid card: ${rank} of ${suit}`);
  }

  return suitIndex * 13 + rankIndex;
}

/**
 * Serialize key for transmission
 */
export function serializeKey(key: bigint): string {
  return key.toString(16);
}

/**
 * Deserialize key from transmission
 */
export function deserializeKey(keyStr: string): bigint {
  return BigInt('0x' + keyStr);
}

/**
 * Generate commitment hash for a value
 */
export async function generateCommitment(value: bigint, salt?: bigint): Promise<{
  commitment: string;
  salt: bigint;
}> {
  const actualSalt = salt ?? randomBigInt(256);
  const data = `${value.toString(16)}:${actualSalt.toString(16)}`;

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const commitment = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { commitment, salt: actualSalt };
}

/**
 * Verify a commitment
 */
export async function verifyCommitment(
  value: bigint,
  salt: bigint,
  commitment: string
): Promise<boolean> {
  const { commitment: computed } = await generateCommitment(value, salt);
  return computed === commitment;
}
