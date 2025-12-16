"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardData {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
}

interface CardProps {
  card: CardData;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  className?: string;
  animate?: boolean;
  delay?: number;
  highlight?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SIZE_CLASSES = {
  sm: "h-12 w-9 text-xs",
  md: "h-16 w-12 text-sm",
  lg: "h-24 w-18 text-lg",
};

export function Card({
  card,
  size = "md",
  faceDown = false,
  className,
  animate = true,
  delay = 0,
  highlight = false,
}: CardProps) {
  const isRed = card.suit === "hearts" || card.suit === "diamonds";

  const cardContent = faceDown ? (
    <CardBack size={size} />
  ) : (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg bg-white shadow-lg",
        SIZE_CLASSES[size],
        highlight && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-green-800",
        className
      )}
    >
      <span
        className={cn(
          "font-bold leading-none",
          isRed ? "text-red-600" : "text-gray-900",
          size === "sm" && "text-xs",
          size === "md" && "text-lg",
          size === "lg" && "text-2xl"
        )}
      >
        {card.rank}
      </span>
      <span
        className={cn(
          isRed ? "text-red-600" : "text-gray-900",
          size === "sm" && "text-sm",
          size === "md" && "text-xl",
          size === "lg" && "text-3xl"
        )}
      >
        {SUIT_SYMBOLS[card.suit] || "?"}
      </span>
    </div>
  );

  if (!animate) {
    return cardContent;
  }

  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180, opacity: 0 }}
      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: delay * 0.1,
      }}
    >
      {cardContent}
    </motion.div>
  );
}

interface CardBackProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CardBack({ size = "md", className }: CardBackProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-gradient-to-br from-red-700 to-red-900 shadow-lg",
        SIZE_CLASSES[size],
        className
      )}
    >
      <div
        className={cn(
          "rounded-sm border border-red-600/50",
          size === "sm" && "h-10 w-7",
          size === "md" && "h-14 w-10",
          size === "lg" && "h-20 w-14"
        )}
        style={{
          background:
            "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)",
        }}
      />
    </div>
  );
}

interface CardPlaceholderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CardPlaceholder({ size = "md", className }: CardPlaceholderProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-green-700/30",
        SIZE_CLASSES[size],
        className
      )}
    />
  );
}

interface CommunityCardsProps {
  cards: CardData[];
  maxCards?: number;
  className?: string;
}

export function CommunityCards({ cards, maxCards = 5, className }: CommunityCardsProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {cards.map((card, i) => (
        <Card key={`${card.suit}-${card.rank}-${i}`} card={card} delay={i} />
      ))}
      {Array.from({ length: maxCards - cards.length }).map((_, i) => (
        <CardPlaceholder key={`placeholder-${i}`} />
      ))}
    </div>
  );
}

interface HoleCardsProps {
  cards: CardData[];
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  className?: string;
}

export function HoleCards({ cards, size = "sm", faceDown = false, className }: HoleCardsProps) {
  if (cards.length === 0 && !faceDown) {
    return null;
  }

  return (
    <div className={cn("flex gap-1", className)}>
      {faceDown ? (
        <>
          <CardBack size={size} />
          <CardBack size={size} />
        </>
      ) : (
        cards.map((card, i) => (
          <Card key={`${card.suit}-${card.rank}-${i}`} card={card} size={size} delay={i} />
        ))
      )}
    </div>
  );
}
