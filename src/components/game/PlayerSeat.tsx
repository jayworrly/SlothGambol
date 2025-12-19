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
          "relative rounded-xl p-3 transition-all min-w-[140px] backdrop-blur-sm",
          isCurrentActor && "ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/30",
          isMe && !isCurrentActor && "ring-2 ring-purple-400",
          player.isFolded && "opacity-40 grayscale"
        )}
        style={{
          background: isCurrentActor
            ? "linear-gradient(145deg, rgba(250,204,21,0.15), rgba(161,98,7,0.1))"
            : isMe
              ? "linear-gradient(145deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))"
              : "linear-gradient(145deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))",
          boxShadow: isCurrentActor
            ? "0 8px 24px rgba(250,204,21,0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
            : isMe
              ? "0 8px 24px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          border: isCurrentActor
            ? "1px solid rgba(250,204,21,0.3)"
            : isMe
              ? "1px solid rgba(139,92,246,0.3)"
              : "1px solid rgba(75,85,99,0.3)",
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
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSeatClick}
        className="group flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-dashed border-purple-500/30 bg-gray-900/40 backdrop-blur-sm transition-all hover:border-purple-500 hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20"
      >
        <span className="text-2xl text-purple-400/60 group-hover:text-purple-400 transition-colors">+</span>
        <span className="text-xs text-gray-500 group-hover:text-purple-300 transition-colors">Seat {position + 1}</span>
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
        "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white",
        isMe
          ? "bg-gradient-to-br from-purple-500 to-violet-600"
          : "bg-gradient-to-br from-gray-600 to-gray-700"
      )}
      style={{
        boxShadow: isMe
          ? "0 4px 12px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
          : "0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {/* Ring border */}
      <div className={cn(
        "absolute inset-0 rounded-full border-2",
        isMe ? "border-purple-300/40" : "border-gray-400/20"
      )} />
      {initials}
    </div>
  );
}

function DealerButton() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-gray-900"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #E5E5E5 100%)",
        boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 2px rgba(0,0,0,0.1)",
        border: "2px solid #DAA520",
      }}
    >
      D
    </motion.div>
  );
}

function BlindBadge({ type }: { type: "SB" | "BB" }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-sm",
        type === "SB"
          ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white"
          : "bg-gradient-to-b from-yellow-400 to-yellow-500 text-gray-900"
      )}
      style={{
        boxShadow: type === "SB"
          ? "0 2px 4px rgba(59,130,246,0.4)"
          : "0 2px 4px rgba(234,179,8,0.4)",
      }}
    >
      {type}
    </span>
  );
}

interface ChipStackProps {
  amount: bigint;
}

function ChipStack({ amount }: ChipStackProps) {
  // Determine chip color based on bet size
  const getChipColor = (amt: bigint) => {
    const value = Number(amt);
    if (value >= 100) return { from: "#8B5CF6", to: "#6D28D9", border: "#A78BFA" }; // Purple - high
    if (value >= 25) return { from: "#EF4444", to: "#B91C1C", border: "#F87171" }; // Red - medium
    if (value >= 5) return { from: "#22C55E", to: "#15803D", border: "#4ADE80" }; // Green - low
    return { from: "#3B82F6", to: "#1D4ED8", border: "#60A5FA" }; // Blue - micro
  };

  const colors = getChipColor(amount);

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        {/* Stacked chips with 3D effect */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: "18px",
              height: "18px",
              background: `linear-gradient(180deg, ${colors.from} 0%, ${colors.to} 100%)`,
              boxShadow: `0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`,
              border: `1.5px dashed ${colors.border}40`,
              top: `${-i * 3}px`,
              left: `${i * 0.5}px`,
            }}
          />
        ))}
        {/* Top chip visible layer */}
        <div
          className="relative rounded-full"
          style={{
            width: "18px",
            height: "18px",
            background: `linear-gradient(180deg, ${colors.from} 0%, ${colors.to} 100%)`,
            boxShadow: `0 3px 6px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.3)`,
            border: `1.5px dashed ${colors.border}60`,
            top: "-9px",
            left: "1.5px",
          }}
        />
      </div>
      <span className="rounded-md bg-black/90 px-2 py-0.5 text-xs font-bold text-white shadow-lg"
        style={{ marginLeft: "8px" }}
      >
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
