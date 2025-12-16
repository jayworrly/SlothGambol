"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatChips } from "@/lib/utils";

export interface AvailableAction {
  type: "fold" | "check" | "call" | "bet" | "raise" | "all_in";
  minAmount?: bigint;
  maxAmount?: bigint;
}

interface ActionPanelProps {
  isMyTurn: boolean;
  availableActions: AvailableAction[];
  currentBet: bigint;
  myBet: bigint;
  myStack: bigint;
  onAction: (action: string, amount?: string) => void;
  actionDeadline: number | null;
  bigBlind: bigint;
  pot: bigint;
  gamePhase?: string;
  playerCount?: number;
  minPlayers?: number;
}

export function ActionPanel({
  isMyTurn,
  availableActions,
  currentBet,
  myBet,
  myStack,
  onAction,
  actionDeadline,
  bigBlind,
  pot,
  gamePhase = "waiting",
  playerCount = 1,
  minPlayers = 2,
}: ActionPanelProps) {
  const [betAmount, setBetAmount] = useState<number>(0);
  const [showSlider, setShowSlider] = useState(false);

  const canFold = availableActions.some((a) => a.type === "fold");
  const canCheck = availableActions.some((a) => a.type === "check");
  const canCall = availableActions.some((a) => a.type === "call");
  const canBet = availableActions.some((a) => a.type === "bet");
  const canRaise = availableActions.some((a) => a.type === "raise");
  const canAllIn = availableActions.some((a) => a.type === "all_in");

  const toCall = currentBet - myBet;
  const minBet = Number(bigBlind);
  const minRaise = Number(currentBet) + Number(bigBlind);
  const maxBet = Number(myStack);

  // Reset bet amount when turn changes
  useEffect(() => {
    if (isMyTurn) {
      const defaultAmount = canBet ? minBet : minRaise;
      setBetAmount(Math.min(defaultAmount, maxBet));
      setShowSlider(false);
    }
  }, [isMyTurn, canBet, minBet, minRaise, maxBet]);

  const handleQuickBet = useCallback(
    (multiplier: number) => {
      const potValue = Number(pot);
      const amount = Math.floor(potValue * multiplier);
      setBetAmount(Math.min(Math.max(amount, canBet ? minBet : minRaise), maxBet));
    },
    [pot, minBet, minRaise, maxBet, canBet]
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetAmount(Number(e.target.value));
  };

  const handleBetAction = () => {
    const action = canBet ? "bet" : "raise";
    onAction(action, betAmount.toString());
    setShowSlider(false);
  };

  if (!isMyTurn) {
    const needsMorePlayers = playerCount < minPlayers;
    const isWaitingPhase = gamePhase === "waiting";

    let message = "Waiting for your turn...";
    let subMessage = "";

    if (isWaitingPhase || needsMorePlayers) {
      const playersNeeded = minPlayers - playerCount;
      message = needsMorePlayers
        ? `Need ${playersNeeded} more player${playersNeeded > 1 ? 's' : ''} to start`
        : "Waiting for game to start...";
      subMessage = `${playerCount}/${minPlayers} players seated`;
    }

    return (
      <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm p-4">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="h-2 w-2 rounded-full bg-gray-600 animate-pulse" />
              <span>{message}</span>
            </div>
            {subMessage && (
              <span className="text-sm text-gray-500">{subMessage}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t border-gray-800 bg-gray-900 p-4"
    >
      <div className="container mx-auto">
        {/* Timer Bar */}
        {actionDeadline && <TimerBar deadline={actionDeadline} />}

        {/* Bet Slider (when expanded) */}
        <AnimatePresence>
          {showSlider && (canBet || canRaise) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="rounded-lg bg-gray-800 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {canBet ? "Bet Amount" : "Raise To"}
                  </span>
                  <span className="text-lg font-bold text-white">
                    {formatChips(betAmount)}
                  </span>
                </div>

                {/* Slider */}
                <div className="mb-4">
                  <input
                    type="range"
                    min={canBet ? minBet : minRaise}
                    max={maxBet}
                    value={betAmount}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>{formatChips(canBet ? minBet : minRaise)}</span>
                    <span>{formatChips(maxBet)}</span>
                  </div>
                </div>

                {/* Quick Bet Buttons */}
                <div className="flex gap-2">
                  <QuickBetButton label="Min" onClick={() => setBetAmount(canBet ? minBet : minRaise)} />
                  <QuickBetButton label="1/3 Pot" onClick={() => handleQuickBet(0.33)} />
                  <QuickBetButton label="1/2 Pot" onClick={() => handleQuickBet(0.5)} />
                  <QuickBetButton label="3/4 Pot" onClick={() => handleQuickBet(0.75)} />
                  <QuickBetButton label="Pot" onClick={() => handleQuickBet(1)} />
                  <QuickBetButton label="Max" onClick={() => setBetAmount(maxBet)} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          {/* Fold */}
          {canFold && (
            <ActionButton
              onClick={() => onAction("fold")}
              variant="fold"
            >
              Fold
            </ActionButton>
          )}

          {/* Check */}
          {canCheck && (
            <ActionButton
              onClick={() => onAction("check")}
              variant="check"
            >
              Check
            </ActionButton>
          )}

          {/* Call */}
          {canCall && (
            <ActionButton
              onClick={() => onAction("call")}
              variant="call"
            >
              Call {formatChips(toCall)}
            </ActionButton>
          )}

          {/* Bet/Raise Toggle */}
          {(canBet || canRaise) && (
            <>
              {showSlider ? (
                <ActionButton
                  onClick={handleBetAction}
                  variant="bet"
                >
                  {canBet ? "Bet" : "Raise to"} {formatChips(betAmount)}
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={() => setShowSlider(true)}
                  variant="bet"
                >
                  {canBet ? "Bet" : "Raise"}
                </ActionButton>
              )}
            </>
          )}

          {/* All-In */}
          {canAllIn && (
            <ActionButton
              onClick={() => onAction("all-in")}
              variant="allin"
            >
              All In ({formatChips(myStack)})
            </ActionButton>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-3 flex justify-center gap-4 text-xs text-gray-600">
          <span>[F] Fold</span>
          <span>[C] Check/Call</span>
          <span>[R] Raise</span>
          <span>[A] All-In</span>
        </div>
      </div>
    </motion.div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  variant: "fold" | "check" | "call" | "bet" | "allin";
  children: React.ReactNode;
  disabled?: boolean;
}

const BUTTON_VARIANTS = {
  fold: "bg-gray-700 hover:bg-gray-600 text-white",
  check: "bg-blue-600 hover:bg-blue-500 text-white",
  call: "bg-blue-600 hover:bg-blue-500 text-white",
  bet: "bg-green-600 hover:bg-green-500 text-white",
  allin: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20",
};

function ActionButton({ onClick, variant, children, disabled }: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg px-6 py-3 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant]
      )}
    >
      {children}
    </motion.button>
  );
}

function QuickBetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded bg-gray-700 px-2 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
    >
      {label}
    </button>
  );
}

interface TimerBarProps {
  deadline: number;
}

function TimerBar({ deadline }: TimerBarProps) {
  const [percentage, setPercentage] = useState(100);

  useEffect(() => {
    const timeBank = 30000; // 30 seconds
    const interval = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setPercentage((remaining / timeBank) * 100);
    }, 100);

    return () => clearInterval(interval);
  }, [deadline]);

  const isLow = percentage < 30;
  const isCritical = percentage < 15;

  return (
    <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-700">
      <motion.div
        className={cn(
          "h-full transition-colors",
          isCritical ? "bg-red-500" : isLow ? "bg-yellow-500" : "bg-green-500"
        )}
        style={{ width: `${percentage}%` }}
        animate={isCritical ? { opacity: [1, 0.5, 1] } : {}}
        transition={isCritical ? { repeat: Infinity, duration: 0.3 } : {}}
      />
    </div>
  );
}

// Keyboard shortcuts hook
export function useActionShortcuts(
  isMyTurn: boolean,
  availableActions: AvailableAction[],
  onAction: (action: string, amount?: string) => void,
  myStack: bigint
) {
  useEffect(() => {
    if (!isMyTurn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement) return;

      const canFold = availableActions.some((a) => a.type === "fold");
      const canCheck = availableActions.some((a) => a.type === "check");
      const canCall = availableActions.some((a) => a.type === "call");
      const canAllIn = availableActions.some((a) => a.type === "all_in");

      switch (e.key.toLowerCase()) {
        case "f":
          if (canFold) onAction("fold");
          break;
        case "c":
          if (canCheck) onAction("check");
          else if (canCall) onAction("call");
          break;
        case "a":
          if (canAllIn) onAction("all-in", myStack.toString());
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMyTurn, availableActions, onAction, myStack]);
}
