"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatChips, shortenAddress } from "@/lib/utils";
import { HoleCards, CardData } from "./Card";

export interface PlayerData {
  id: string;
  username?: string;
  walletAddress: string;
  stack: bigint;
  currentBet: bigint;
  isDealer: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isTurn: boolean;
  isFolded: boolean;
  isAllIn?: boolean;
  lastAction?: string;
}

interface PlayerSeatProps {
  position: number;
  style: React.CSSProperties;
  player?: PlayerData;
  isCurrentActor: boolean;
  isMe: boolean;
  myCards?: CardData[];
  onSeatClick: () => void;
  actionDeadline?: number | null;
  timeBank?: number;
}

export function PlayerSeat({
  position,
  style,
  player,
  isCurrentActor,
  isMe,
  myCards,
  onSeatClick,
  actionDeadline,
  timeBank = 30,
}: PlayerSeatProps) {
  if (!player) {
    return <EmptySeat position={position} style={style} onSeatClick={onSeatClick} />;
  }

  return (
    <div className="absolute" style={style}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={cn(
          "relative rounded-xl p-3 transition-all min-w-[140px]",
          isCurrentActor && "ring-2 ring-yellow-500 shadow-lg shadow-yellow-500/20",
          isMe && !isCurrentActor && "ring-2 ring-blue-500",
          !isCurrentActor && !isMe && "bg-gray-900/90",
          player.isFolded && "opacity-50"
        )}
        style={{
          background: isCurrentActor
            ? "linear-gradient(145deg, rgba(234,179,8,0.2), rgba(161,98,7,0.1))"
            : isMe
              ? "linear-gradient(145deg, rgba(59,130,246,0.2), rgba(29,78,216,0.1))"
              : "rgba(17,24,39,0.9)",
        }}
      >
        {/* Position Badges */}
        <div className="absolute -right-2 -top-2 flex gap-1">
          {player.isDealer && <DealerButton />}
          {player.isSmallBlind && <BlindBadge type="SB" />}
          {player.isBigBlind && <BlindBadge type="BB" />}
        </div>

        {/* All-In Badge */}
        {player.isAllIn && (
          <div className="absolute -left-2 -top-2">
            <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow">
              ALL IN
            </span>
          </div>
        )}

        {/* Avatar and Info */}
        <div className="mb-2 flex items-center gap-2">
          <PlayerAvatar
            username={player.username}
            walletAddress={player.walletAddress}
            isMe={isMe}
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {player.username || shortenAddress(player.walletAddress)}
            </p>
            <p className="text-xs font-semibold text-green-400">
              {formatChips(player.stack)}
            </p>
          </div>
        </div>

        {/* Hole Cards */}
        <div className="flex justify-center">
          {player.isFolded ? null : isMe && myCards && myCards.length > 0 ? (
            <HoleCards cards={myCards} size="sm" />
          ) : (
            <HoleCards cards={[]} size="sm" faceDown />
          )}
        </div>

        {/* Last Action */}
        <AnimatePresence>
          {player.lastAction && !player.isFolded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2"
            >
              <span className="whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-300">
                {player.lastAction}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Bet Chips */}
        <AnimatePresence>
          {player.currentBet > 0n && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2"
            >
              <ChipStack amount={player.currentBet} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Turn Timer */}
        {isCurrentActor && actionDeadline && (
          <TurnTimer deadline={actionDeadline} timeBank={timeBank} />
        )}
      </motion.div>
    </div>
  );
}

interface EmptySeatProps {
  position: number;
  style: React.CSSProperties;
  onSeatClick: () => void;
}

function EmptySeat({ position, style, onSeatClick }: EmptySeatProps) {
  return (
    <div className="absolute" style={style}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSeatClick}
        className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-600 bg-gray-800/30 transition-all hover:border-green-500 hover:bg-gray-800/50"
      >
        <span className="text-2xl text-gray-500">+</span>
        <span className="text-xs text-gray-500">Seat {position + 1}</span>
      </motion.button>
    </div>
  );
}

interface PlayerAvatarProps {
  username?: string;
  walletAddress: string;
  isMe: boolean;
}

function PlayerAvatar({ username, walletAddress, isMe }: PlayerAvatarProps) {
  const initials = (username || walletAddress).slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner",
        isMe
          ? "bg-gradient-to-br from-blue-500 to-blue-700"
          : "bg-gradient-to-br from-red-500 to-red-700"
      )}
    >
      {initials}
    </div>
  );
}

function DealerButton() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-black shadow-lg"
    >
      D
    </motion.div>
  );
}

function BlindBadge({ type }: { type: "SB" | "BB" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold",
        type === "SB" ? "bg-blue-600 text-white" : "bg-yellow-500 text-black"
      )}
    >
      {type}
    </span>
  );
}

interface ChipStackProps {
  amount: bigint;
}

function ChipStack({ amount }: ChipStackProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        {/* Stack of chips visual */}
        <div className="h-4 w-4 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 shadow" />
        <div className="absolute -bottom-0.5 left-0.5 h-4 w-4 rounded-full bg-gradient-to-b from-yellow-500 to-yellow-700 shadow" />
      </div>
      <span className="rounded bg-black/80 px-2 py-0.5 text-xs font-bold text-yellow-400">
        {formatChips(amount)}
      </span>
    </div>
  );
}

interface TurnTimerProps {
  deadline: number;
  timeBank: number;
}

function TurnTimer({ deadline, timeBank }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(timeBank);
  const [percentage, setPercentage] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      const pct = (remaining / (timeBank * 1000)) * 100;

      setTimeLeft(seconds);
      setPercentage(pct);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [deadline, timeBank]);

  const isLow = percentage < 30;
  const isCritical = percentage < 15;

  return (
    <div className="absolute -bottom-1 left-0 right-0 overflow-hidden rounded-b-xl">
      {/* Timer bar */}
      <div className="h-1.5 bg-gray-700">
        <motion.div
          className={cn(
            "h-full transition-colors",
            isCritical ? "bg-red-500" : isLow ? "bg-yellow-500" : "bg-green-500"
          )}
          style={{ width: `${percentage}%` }}
          animate={isCritical ? { opacity: [1, 0.5, 1] } : {}}
          transition={isCritical ? { repeat: Infinity, duration: 0.5 } : {}}
        />
      </div>
      {/* Time text */}
      <div className="absolute -top-6 right-2">
        <span
          className={cn(
            "text-xs font-bold",
            isCritical ? "text-red-400" : isLow ? "text-yellow-400" : "text-gray-400"
          )}
        >
          {timeLeft}s
        </span>
      </div>
    </div>
  );
}

// Seat positions for different table sizes
export const SEAT_POSITIONS_9: React.CSSProperties[] = [
  { bottom: "2%", left: "50%", transform: "translateX(-50%)" },
  { bottom: "15%", left: "12%", transform: "translate(-50%, 0)" },
  { top: "50%", left: "2%", transform: "translateY(-50%)" },
  { top: "15%", left: "12%", transform: "translate(-50%, 0)" },
  { top: "2%", left: "50%", transform: "translateX(-50%)" },
  { top: "15%", right: "12%", transform: "translate(50%, 0)" },
  { top: "50%", right: "2%", transform: "translateY(-50%)" },
  { bottom: "15%", right: "12%", transform: "translate(50%, 0)" },
  { bottom: "35%", left: "5%", transform: "translateY(50%)" },
];

export const SEAT_POSITIONS_6: React.CSSProperties[] = [
  { bottom: "5%", left: "50%", transform: "translateX(-50%)" },
  { bottom: "25%", left: "10%", transform: "translate(-50%, 0)" },
  { top: "25%", left: "10%", transform: "translate(-50%, 0)" },
  { top: "5%", left: "50%", transform: "translateX(-50%)" },
  { top: "25%", right: "10%", transform: "translate(50%, 0)" },
  { bottom: "25%", right: "10%", transform: "translate(50%, 0)" },
];

export function getSeatPositions(capacity: 6 | 9): React.CSSProperties[] {
  return capacity === 6 ? SEAT_POSITIONS_6 : SEAT_POSITIONS_9;
}
