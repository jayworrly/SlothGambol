"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MentalPokerPhase } from "@/stores/gameStore";

interface MentalPokerStatusProps {
  enabled: boolean;
  phase: MentalPokerPhase;
  commitmentsReceived: number;
  totalPlayers: number;
  currentShuffler?: string | null;
  isMyShuffleTurn: boolean;
  pendingKeyRequests: number;
}

const PHASE_INFO: Record<
  MentalPokerPhase,
  { label: string; description: string; icon: string }
> = {
  inactive: {
    label: "Inactive",
    description: "Mental Poker not active",
    icon: "⚪",
  },
  commitment: {
    label: "Commitment",
    description: "Players submitting shuffle commitments",
    icon: "🔐",
  },
  shuffle: {
    label: "Shuffling",
    description: "Players encrypting and shuffling deck",
    icon: "🔀",
  },
  deal: {
    label: "Dealing",
    description: "Cards being dealt securely",
    icon: "🎴",
  },
  play: {
    label: "Playing",
    description: "Trustless gameplay in progress",
    icon: "✅",
  },
  complete: {
    label: "Complete",
    description: "Hand finished",
    icon: "🏁",
  },
};

export function MentalPokerStatus({
  enabled,
  phase,
  commitmentsReceived,
  totalPlayers,
  currentShuffler,
  isMyShuffleTurn,
  pendingKeyRequests,
}: MentalPokerStatusProps) {
  if (!enabled) {
    return null;
  }

  const phaseInfo = PHASE_INFO[phase];
  const isActive = phase !== "inactive" && phase !== "complete";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed right-4 top-20 z-40"
    >
      <div className="rounded-lg border border-gray-700 bg-gray-900/95 backdrop-blur-sm shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2">
          <span className="text-lg">{phaseInfo.icon}</span>
          <div>
            <h3 className="text-sm font-medium text-white">Mental Poker</h3>
            <p className="text-xs text-gray-400">{phaseInfo.label}</p>
          </div>
          {isActive && (
            <div className="ml-auto">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Content based on phase */}
        <div className="p-4 min-w-[200px]">
          <AnimatePresence mode="wait">
            {phase === "commitment" && (
              <CommitmentStatus
                key="commitment"
                received={commitmentsReceived}
                total={totalPlayers}
              />
            )}

            {phase === "shuffle" && (
              <ShuffleStatus
                key="shuffle"
                currentShuffler={currentShuffler}
                isMyTurn={isMyShuffleTurn}
              />
            )}

            {phase === "deal" && (
              <DealStatus
                key="deal"
                pendingRequests={pendingKeyRequests}
              />
            )}

            {phase === "play" && (
              <PlayStatus key="play" />
            )}

            {phase === "inactive" && (
              <InactiveStatus key="inactive" />
            )}
          </AnimatePresence>
        </div>

        {/* Action required indicator */}
        {(isMyShuffleTurn || pendingKeyRequests > 0) && (
          <div className="border-t border-gray-800 bg-yellow-500/10 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs font-medium text-yellow-400">
                {isMyShuffleTurn ? "Your turn to shuffle" : `${pendingKeyRequests} key reveal(s) pending`}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CommitmentStatus({ received, total }: { received: number; total: number }) {
  const percentage = total > 0 ? (received / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <p className="mb-2 text-xs text-gray-400">
        Collecting shuffle commitments...
      </p>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-700">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-300">
        {received} / {total} players committed
      </p>
    </motion.div>
  );
}

function ShuffleStatus({
  currentShuffler,
  isMyTurn,
}: {
  currentShuffler?: string | null;
  isMyTurn: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <p className="mb-2 text-xs text-gray-400">
        Sequential deck encryption in progress...
      </p>

      <div className="flex items-center gap-2 rounded-lg bg-gray-800 p-2">
        {isMyTurn ? (
          <>
            <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm font-medium text-yellow-400">
              Your turn to shuffle!
            </span>
          </>
        ) : (
          <>
            <Spinner />
            <span className="text-sm text-gray-300">
              Waiting for {currentShuffler ? `player ${currentShuffler.slice(0, 8)}...` : "next player"}
            </span>
          </>
        )}
      </div>

      {isMyTurn && (
        <p className="mt-2 text-xs text-gray-500">
          Encrypting and shuffling deck automatically...
        </p>
      )}
    </motion.div>
  );
}

function DealStatus({ pendingRequests }: { pendingRequests: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <p className="mb-2 text-xs text-gray-400">
        Secure card dealing in progress...
      </p>

      <div className="flex items-center gap-2 rounded-lg bg-gray-800 p-2">
        <div className="flex -space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-6 w-4 rounded-sm bg-gradient-to-br from-red-700 to-red-900"
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 0.5,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-300">
          Dealing cards...
        </span>
      </div>

      {pendingRequests > 0 && (
        <p className="mt-2 text-xs text-yellow-400">
          {pendingRequests} key reveal{pendingRequests > 1 ? "s" : ""} pending
        </p>
      )}
    </motion.div>
  );
}

function PlayStatus() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center gap-2 text-green-400">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span className="text-sm font-medium">Trustless mode active</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        All cards dealt using Mental Poker protocol. No server knows the deck order.
      </p>
    </motion.div>
  );
}

function InactiveStatus() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center"
    >
      <p className="text-xs text-gray-500">
        Mental Poker will activate when the hand starts
      </p>
    </motion.div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Compact version for the info bar
export function MentalPokerBadge({
  enabled,
  phase,
}: {
  enabled: boolean;
  phase: MentalPokerPhase;
}) {
  if (!enabled) return null;

  const phaseInfo = PHASE_INFO[phase];
  const isActive = phase !== "inactive" && phase !== "complete";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
        isActive
          ? "bg-green-500/20 text-green-400"
          : "bg-gray-700 text-gray-400"
      )}
    >
      <span>{phaseInfo.icon}</span>
      <span>MP: {phaseInfo.label}</span>
    </span>
  );
}
