"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatChips } from "@/lib/utils";

interface PotDisplayProps {
  pot: bigint;
  currentBet: bigint;
  sidePots?: { amount: bigint; eligiblePlayers: string[] }[];
}

export function PotDisplay({ pot, currentBet, sidePots = [] }: PotDisplayProps) {
  return (
    <div className="text-center">
      <motion.div
        className="rounded-xl bg-black/70 px-6 py-4 backdrop-blur-sm border border-yellow-600/20"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Main Pot */}
        <div className="mb-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Pot
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={pot.toString()}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="text-3xl font-bold text-yellow-400"
            >
              {formatChips(pot)}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Current Bet to Call */}
        {currentBet > 0n && (
          <div className="mt-2 border-t border-gray-700 pt-2">
            <p className="text-xs text-gray-500">
              To call:{" "}
              <span className="font-medium text-gray-300">
                {formatChips(currentBet)}
              </span>
            </p>
          </div>
        )}

        {/* Side Pots */}
        {sidePots.length > 0 && (
          <div className="mt-2 border-t border-gray-700 pt-2">
            <p className="text-xs text-gray-500 mb-1">Side Pots</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {sidePots.map((sidePot, i) => (
                <span
                  key={i}
                  className="rounded bg-yellow-600/20 px-2 py-0.5 text-xs font-medium text-yellow-400"
                >
                  {formatChips(sidePot.amount)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chip stack visual */}
        <div className="mt-3 flex justify-center">
          <ChipStackVisual amount={pot} />
        </div>
      </motion.div>
    </div>
  );
}

function ChipStackVisual({ amount }: { amount: bigint }) {
  const numAmount = Number(amount);

  // Calculate chip breakdown
  const chipColors = [
    { value: 1000, color: "from-yellow-400 to-yellow-600", border: "border-yellow-500" },
    { value: 500, color: "from-purple-400 to-purple-600", border: "border-purple-500" },
    { value: 100, color: "from-gray-800 to-gray-900", border: "border-gray-600" },
    { value: 25, color: "from-green-400 to-green-600", border: "border-green-500" },
    { value: 5, color: "from-red-400 to-red-600", border: "border-red-500" },
    { value: 1, color: "from-blue-400 to-blue-600", border: "border-blue-500" },
  ];

  const chips: { color: string; border: string }[] = [];
  let remaining = numAmount;

  for (const { value, color, border } of chipColors) {
    const count = Math.min(Math.floor(remaining / value), 5); // Max 5 chips per denomination
    remaining -= count * value;

    for (let i = 0; i < count; i++) {
      chips.push({ color, border });
    }

    if (chips.length >= 8) break; // Max 8 chips displayed
  }

  if (chips.length === 0) {
    chips.push({ color: chipColors[5].color, border: chipColors[5].border });
  }

  return (
    <div className="flex justify-center">
      <div className="relative flex">
        {chips.slice(0, 8).map((chip, i) => (
          <motion.div
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`relative -ml-2 first:ml-0 h-3 w-6 rounded-full bg-gradient-to-b ${chip.color} border ${chip.border}`}
            style={{
              transform: `translateY(${i % 2 === 0 ? 0 : -2}px)`,
              zIndex: chips.length - i,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Animated pot update component
export function PotUpdateAnimation({ amount }: { amount: bigint }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="absolute text-lg font-bold text-green-400"
      >
        +{formatChips(amount)}
      </motion.div>
    </AnimatePresence>
  );
}
