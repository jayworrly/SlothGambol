import type { Card, Rank, Suit, HandRanking, HandRankType } from '../types/poker.js';

// Rank values for comparison (Ace high = 14, Ace low = 1)
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Hand rank values for comparison
const HAND_RANK_VALUES: Record<HandRankType, number> = {
  'high-card': 1,
  'pair': 2,
  'two-pair': 3,
  'three-of-a-kind': 4,
  'straight': 5,
  'flush': 6,
  'full-house': 7,
  'four-of-a-kind': 8,
  'straight-flush': 9,
  'royal-flush': 10
};

/**
 * Get numeric value of a rank
 */
function getRankValue(rank: Rank, aceLow = false): number {
  if (rank === 'A' && aceLow) return 1;
  return RANK_VALUES[rank];
}

/**
 * Sort cards by rank (descending)
 */
function sortByRank(cards: Card[], aceLow = false): Card[] {
  return [...cards].sort((a, b) => getRankValue(b.rank, aceLow) - getRankValue(a.rank, aceLow));
}

/**
 * Group cards by rank
 */
function groupByRank(cards: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  for (const card of cards) {
    const existing = groups.get(card.rank) || [];
    existing.push(card);
    groups.set(card.rank, existing);
  }
  return groups;
}

/**
 * Group cards by suit
 */
function groupBySuit(cards: Card[]): Map<Suit, Card[]> {
  const groups = new Map<Suit, Card[]>();
  for (const card of cards) {
    const existing = groups.get(card.suit) || [];
    existing.push(card);
    groups.set(card.suit, existing);
  }
  return groups;
}

/**
 * Check for flush (5+ cards of same suit)
 */
function findFlush(cards: Card[]): Card[] | null {
  const suitGroups = groupBySuit(cards);
  for (const [, suited] of suitGroups) {
    if (suited.length >= 5) {
      return sortByRank(suited).slice(0, 5);
    }
  }
  return null;
}

/**
 * Check for straight (5 consecutive ranks)
 */
function findStraight(cards: Card[]): Card[] | null {
  // Get unique ranks sorted descending
  const uniqueRanks = new Map<number, Card>();
  for (const card of cards) {
    const value = getRankValue(card.rank);
    if (!uniqueRanks.has(value)) {
      uniqueRanks.set(value, card);
    }
  }

  // Check for Ace-low straight (A-2-3-4-5)
  if (uniqueRanks.has(14) && uniqueRanks.has(2) && uniqueRanks.has(3) && uniqueRanks.has(4) && uniqueRanks.has(5)) {
    return [
      uniqueRanks.get(5)!,
      uniqueRanks.get(4)!,
      uniqueRanks.get(3)!,
      uniqueRanks.get(2)!,
      uniqueRanks.get(14)!
    ];
  }

  // Check for regular straights
  const sortedValues = Array.from(uniqueRanks.keys()).sort((a, b) => b - a);

  for (let i = 0; i <= sortedValues.length - 5; i++) {
    let consecutive = true;
    for (let j = 0; j < 4; j++) {
      if (sortedValues[i + j] - sortedValues[i + j + 1] !== 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return sortedValues.slice(i, i + 5).map(v => uniqueRanks.get(v)!);
    }
  }

  return null;
}

/**
 * Check for straight flush
 */
function findStraightFlush(cards: Card[]): Card[] | null {
  const suitGroups = groupBySuit(cards);
  for (const [, suited] of suitGroups) {
    if (suited.length >= 5) {
      const straight = findStraight(suited);
      if (straight) {
        return straight;
      }
    }
  }
  return null;
}

/**
 * Evaluate a 5-7 card hand and return the best 5-card hand
 */
export function evaluateHand(cards: Card[]): HandRanking {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  const rankGroups = groupByRank(cards);
  const groupCounts: { rank: Rank; count: number; cards: Card[] }[] = [];

  for (const [rank, groupCards] of rankGroups) {
    groupCounts.push({ rank, count: groupCards.length, cards: groupCards });
  }

  // Sort by count (desc), then by rank value (desc)
  groupCounts.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return getRankValue(b.rank) - getRankValue(a.rank);
  });

  // Check for straight flush / royal flush
  const straightFlush = findStraightFlush(cards);
  if (straightFlush) {
    const highCard = straightFlush[0];
    const isRoyal = highCard.rank === 'A';
    return {
      rank: isRoyal ? 'royal-flush' : 'straight-flush',
      cards: straightFlush,
      kickers: [],
      description: isRoyal
        ? `Royal Flush in ${highCard.suit}`
        : `Straight Flush, ${highCard.rank} high`
    };
  }

  // Check for four of a kind
  if (groupCounts[0].count === 4) {
    const quads = groupCounts[0].cards;
    const kickers = sortByRank(cards.filter(c => c.rank !== groupCounts[0].rank)).slice(0, 1);
    return {
      rank: 'four-of-a-kind',
      cards: quads,
      kickers,
      description: `Four of a Kind, ${groupCounts[0].rank}s`
    };
  }

  // Check for full house
  if (groupCounts[0].count === 3 && groupCounts.length > 1 && groupCounts[1].count >= 2) {
    const trips = groupCounts[0].cards;
    const pair = groupCounts[1].cards.slice(0, 2);
    return {
      rank: 'full-house',
      cards: [...trips, ...pair],
      kickers: [],
      description: `Full House, ${groupCounts[0].rank}s full of ${groupCounts[1].rank}s`
    };
  }

  // Check for flush
  const flush = findFlush(cards);
  if (flush) {
    return {
      rank: 'flush',
      cards: flush,
      kickers: [],
      description: `Flush, ${flush[0].rank} high`
    };
  }

  // Check for straight
  const straight = findStraight(cards);
  if (straight) {
    const isWheel = straight[0].rank === '5' && straight[4].rank === 'A';
    return {
      rank: 'straight',
      cards: straight,
      kickers: [],
      description: isWheel ? 'Straight, 5 high (wheel)' : `Straight, ${straight[0].rank} high`
    };
  }

  // Check for three of a kind
  if (groupCounts[0].count === 3) {
    const trips = groupCounts[0].cards;
    const kickers = sortByRank(cards.filter(c => c.rank !== groupCounts[0].rank)).slice(0, 2);
    return {
      rank: 'three-of-a-kind',
      cards: trips,
      kickers,
      description: `Three of a Kind, ${groupCounts[0].rank}s`
    };
  }

  // Check for two pair
  if (groupCounts[0].count === 2 && groupCounts.length > 1 && groupCounts[1].count === 2) {
    const highPair = groupCounts[0].cards;
    const lowPair = groupCounts[1].cards;
    const kickers = sortByRank(
      cards.filter(c => c.rank !== groupCounts[0].rank && c.rank !== groupCounts[1].rank)
    ).slice(0, 1);
    return {
      rank: 'two-pair',
      cards: [...highPair, ...lowPair],
      kickers,
      description: `Two Pair, ${groupCounts[0].rank}s and ${groupCounts[1].rank}s`
    };
  }

  // Check for pair
  if (groupCounts[0].count === 2) {
    const pair = groupCounts[0].cards;
    const kickers = sortByRank(cards.filter(c => c.rank !== groupCounts[0].rank)).slice(0, 3);
    return {
      rank: 'pair',
      cards: pair,
      kickers,
      description: `Pair of ${groupCounts[0].rank}s`
    };
  }

  // High card
  const sorted = sortByRank(cards);
  return {
    rank: 'high-card',
    cards: sorted.slice(0, 5),
    kickers: [],
    description: `High Card, ${sorted[0].rank}`
  };
}

/**
 * Compare two hand rankings. Returns:
 *  1 if hand1 wins
 * -1 if hand2 wins
 *  0 if tie
 */
export function compareHands(hand1: HandRanking, hand2: HandRanking): number {
  const rank1 = HAND_RANK_VALUES[hand1.rank];
  const rank2 = HAND_RANK_VALUES[hand2.rank];

  if (rank1 !== rank2) {
    return rank1 > rank2 ? 1 : -1;
  }

  // Same hand rank - compare card values
  const cards1 = [...hand1.cards, ...hand1.kickers];
  const cards2 = [...hand2.cards, ...hand2.kickers];

  // Special case for wheel straight
  if (hand1.rank === 'straight' || hand1.rank === 'straight-flush') {
    const high1 = cards1[0].rank === '5' && cards1[4].rank === 'A' ? 5 : getRankValue(cards1[0].rank);
    const high2 = cards2[0].rank === '5' && cards2[4].rank === 'A' ? 5 : getRankValue(cards2[0].rank);
    if (high1 !== high2) return high1 > high2 ? 1 : -1;
    return 0;
  }

  // Compare card by card
  const len = Math.min(cards1.length, cards2.length);
  for (let i = 0; i < len; i++) {
    const val1 = getRankValue(cards1[i].rank);
    const val2 = getRankValue(cards2[i].rank);
    if (val1 !== val2) {
      return val1 > val2 ? 1 : -1;
    }
  }

  return 0; // Tie
}

/**
 * Find the best 5-card hand from 7 cards (Texas Hold'em)
 */
export function findBestHand(holeCards: Card[], communityCards: Card[]): HandRanking {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards');
  }

  if (allCards.length === 5) {
    return evaluateHand(allCards);
  }

  // Generate all 5-card combinations
  let bestHand: HandRanking | null = null;

  const combinations = getCombinations(allCards, 5);
  for (const combo of combinations) {
    const hand = evaluateHand(combo);
    if (!bestHand || compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand!;
}

/**
 * Generate all k-combinations from an array
 */
function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];

  function combine(start: number, combo: T[]) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return result;
}

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

/**
 * Fisher-Yates shuffle (for local/dev use - production uses mental poker)
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
