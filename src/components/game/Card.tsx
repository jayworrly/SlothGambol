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
  sm: "h-14 w-10 text-xs",
  md: "h-20 w-14 text-sm",
  lg: "h-28 w-20 text-lg",
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
        "relative flex flex-col items-center justify-center rounded-lg overflow-hidden",
        SIZE_CLASSES[size],
        highlight && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-green-800",
        className
      )}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
      }}
    >
      {/* Card border */}
      <div className="absolute inset-0.5 rounded-md border border-gray-200/50" />

      {/* Top left corner */}
      <div className={cn(
        "absolute top-1 left-1 flex flex-col items-center",
        size === "sm" && "text-[10px]",
        size === "md" && "text-xs",
        size === "lg" && "text-sm"
      )}>
        <span className={cn("font-bold leading-tight", isRed ? "text-red-600" : "text-gray-900")}>
          {card.rank}
        </span>
        <span className={cn("leading-none", isRed ? "text-red-600" : "text-gray-900")}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>

      {/* Center suit */}
      <span
        className={cn(
          "font-bold",
          isRed ? "text-red-600" : "text-gray-900",
          size === "sm" && "text-xl",
          size === "md" && "text-3xl",
          size === "lg" && "text-5xl"
        )}
      >
        {SUIT_SYMBOLS[card.suit] || "?"}
      </span>

      {/* Bottom right corner (rotated) */}
      <div className={cn(
        "absolute bottom-1 right-1 flex flex-col items-center rotate-180",
        size === "sm" && "text-[10px]",
        size === "md" && "text-xs",
        size === "lg" && "text-sm"
      )}>
        <span className={cn("font-bold leading-tight", isRed ? "text-red-600" : "text-gray-900")}>
          {card.rank}
        </span>
        <span className={cn("leading-none", isRed ? "text-red-600" : "text-gray-900")}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
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
        "relative flex items-center justify-center rounded-lg overflow-hidden",
        SIZE_CLASSES[size],
        className
      )}
      style={{
        background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #4C1D95 100%)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
      }}
    >
      {/* Card border */}
      <div className="absolute inset-0.5 rounded-md border border-purple-400/30" />

      {/* Diamond pattern */}
      <div
        className="absolute inset-2 rounded-sm"
        style={{
          background: `
            repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 8px),
            repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 8px)
          `,
        }}
      />

      {/* Center logo/emblem */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full bg-gradient-to-br from-purple-400/40 to-violet-600/40 border border-purple-300/30",
          size === "sm" && "h-6 w-6",
          size === "md" && "h-8 w-8",
          size === "lg" && "h-12 w-12"
        )}
      >
        <span className={cn(
          "font-bold text-purple-200/80",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-lg"
        )}>
          SG
        </span>
      </div>

      {/* Shine effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
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
