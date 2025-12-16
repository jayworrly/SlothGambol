"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatChips } from "@/lib/utils";
import { Card, CardData } from "./Card";

export interface WinnerInfo {
  playerId: string;
  username?: string;
  amount: bigint;
  hand: {
    rank: string;
    description: string;
    cards?: CardData[];
  };
}

export interface PotResult {
  amount: bigint;
  winners: string[];
  type: "main" | "side";
}

interface HandResultProps {
  show: boolean;
  winners: WinnerInfo[];
  pots: PotResult[];
  onClose?: () => void;
  autoCloseDelay?: number;
}

const HAND_RANK_DISPLAY: Record<string, { name: string; emoji: string }> = {
  "royal-flush": { name: "Royal Flush", emoji: "👑" },
  "straight-flush": { name: "Straight Flush", emoji: "🌟" },
  "four-of-a-kind": { name: "Four of a Kind", emoji: "🎰" },
  "full-house": { name: "Full House", emoji: "🏠" },
  "flush": { name: "Flush", emoji: "♠️" },
  "straight": { name: "Straight", emoji: "📈" },
  "three-of-a-kind": { name: "Three of a Kind", emoji: "3️⃣" },
  "two-pair": { name: "Two Pair", emoji: "✌️" },
  "pair": { name: "Pair", emoji: "👯" },
  "high-card": { name: "High Card", emoji: "🃏" },
};

export function HandResult({
  show,
  winners,
  pots,
  onClose,
  autoCloseDelay = 5000,
}: HandResultProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);

    if (show && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDelay, onClose]);

  const totalWinnings = winners.reduce((sum, w) => sum + w.amount, 0n);
  const isSplit = winners.length > 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti effect for big wins */}
            {totalWinnings > 1000n && <Confetti />}

            {/* Main card */}
            <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-gray-900 to-gray-950 p-6 shadow-2xl shadow-yellow-500/10">
              {/* Header */}
              <div className="mb-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mb-2 text-4xl"
                >
                  🏆
                </motion.div>
                <h2 className="text-2xl font-bold text-white">
                  {isSplit ? "Split Pot!" : "Winner!"}
                </h2>
              </div>

              {/* Winners */}
              <div className="space-y-4">
                {winners.map((winner, index) => (
                  <WinnerCard key={winner.playerId} winner={winner} index={index} />
                ))}
              </div>

              {/* Pot breakdown (if multiple pots) */}
              {pots.length > 1 && (
                <div className="mt-6 border-t border-gray-800 pt-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-400">Pot Breakdown</h3>
                  <div className="space-y-2">
                    {pots.map((pot, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          {pot.type === "main" ? "Main Pot" : `Side Pot ${i}`}
                        </span>
                        <span className="font-medium text-yellow-400">
                          {formatChips(pot.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => {
                  setVisible(false);
                  onClose?.();
                }}
                className="mt-6 w-full rounded-lg bg-gray-800 py-3 font-medium text-white transition-colors hover:bg-gray-700"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface WinnerCardProps {
  winner: WinnerInfo;
  index: number;
}

function WinnerCard({ winner, index }: WinnerCardProps) {
  const handInfo = HAND_RANK_DISPLAY[winner.hand.rank] || {
    name: winner.hand.description,
    emoji: "🃏",
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.1 + 0.3 }}
      className="rounded-xl bg-gray-800/50 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 text-lg font-bold text-white">
            {(winner.username || "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">
              {winner.username || "Unknown Player"}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{handInfo.emoji}</span>
              <span className="text-sm text-gray-400">{handInfo.name}</span>
            </div>
          </div>
        </div>

        {/* Winnings */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.5, type: "spring" }}
          className="text-right"
        >
          <p className="text-2xl font-bold text-yellow-400">
            +{formatChips(winner.amount)}
          </p>
          <p className="text-xs text-gray-500">chips won</p>
        </motion.div>
      </div>

      {/* Winning cards */}
      {winner.hand.cards && winner.hand.cards.length > 0 && (
        <div className="mt-3 flex justify-center gap-1">
          {winner.hand.cards.map((card, i) => (
            <Card
              key={`${card.suit}-${card.rank}-${i}`}
              card={card}
              size="sm"
              highlight
              delay={i}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Confetti() {
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * 400 - 200,
            y: -20,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: 600,
            rotate: Math.random() * 720 - 360,
            opacity: 0,
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            delay: Math.random() * 0.5,
            ease: "linear",
          }}
          className="absolute left-1/2 top-0 h-3 w-3 rounded-sm"
          style={{
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          }}
        />
      ))}
    </div>
  );
}

// Store integration hook
export function useHandResult() {
  const [result, setResult] = useState<{
    show: boolean;
    winners: WinnerInfo[];
    pots: PotResult[];
  }>({
    show: false,
    winners: [],
    pots: [],
  });

  const showResult = (winners: WinnerInfo[], pots: PotResult[]) => {
    setResult({ show: true, winners, pots });
  };

  const hideResult = () => {
    setResult((prev) => ({ ...prev, show: false }));
  };

  return {
    ...result,
    showResult,
    hideResult,
  };
}
