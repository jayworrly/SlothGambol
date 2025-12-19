"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { MentalPokerGame } from "@/lib/mental-poker";

/**
 * Custom hook for Mental Poker protocol integration
 *
 * This hook manages the client-side Mental Poker protocol:
 * - Generates and sends commitments when commitment phase starts
 * - Encrypts and shuffles deck when it's our turn
 * - Reveals decryption keys when requested
 * - Decrypts cards when all keys are available
 */
export function useMentalPoker() {
  const gameRef = useRef<MentalPokerGame | null>(null);
  const { playerId, sendCommitment, sendShuffle, sendKeyReveal } =
    useWebSocket();

  const {
    mentalPokerPhase,
    mentalPokerEnabled,
    encryptedDeck,
    isMyShuffleTurn,
    pendingKeyRequests,
    players,
    setMentalPokerEnabled,
  } = useGameStore();

  // Initialize Mental Poker game when enabled
  useEffect(() => {
    if (mentalPokerEnabled && playerId && !gameRef.current) {
      gameRef.current = new MentalPokerGame(playerId);
      console.log("Mental Poker game initialized");
    }

    if (!mentalPokerEnabled && gameRef.current) {
      gameRef.current = null;
      console.log("Mental Poker game destroyed");
    }
  }, [mentalPokerEnabled, playerId]);

  // Set players when they change
  useEffect(() => {
    if (gameRef.current && players.length > 0) {
      const playerIds = players.map((p) => p.id);
      gameRef.current.setPlayers(playerIds);
    }
  }, [players]);

  // Handle commitment phase
  useEffect(() => {
    async function sendMyCommitment() {
      if (
        mentalPokerPhase === "commitment" &&
        gameRef.current &&
        mentalPokerEnabled
      ) {
        try {
          const commitment = await gameRef.current.generateShuffleCommitment();
          const result = await sendCommitment(commitment);
          if (result.success) {
            console.log("Commitment sent successfully");
          } else {
            console.error("Failed to send commitment:", result.error);
          }
        } catch (error) {
          console.error("Error generating commitment:", error);
        }
      }
    }

    sendMyCommitment();
  }, [mentalPokerPhase, mentalPokerEnabled, sendCommitment]);

  // Handle shuffle turn
  useEffect(() => {
    async function doShuffle() {
      if (isMyShuffleTurn && gameRef.current && encryptedDeck.length > 0) {
        try {
          // Convert string deck to bigint for processing
          const deckAsBigInt = encryptedDeck.map((s) => BigInt(s));

          // Encrypt and shuffle
          const shuffledDeck = gameRef.current.processShuffleTurn(deckAsBigInt);

          // Convert back to strings
          const shuffledDeckStrings = shuffledDeck.map((n) => n.toString());

          const result = await sendShuffle(shuffledDeckStrings);
          if (result.success) {
            console.log("Shuffle completed successfully");
          } else {
            console.error("Failed to send shuffle:", result.error);
          }
        } catch (error) {
          console.error("Error during shuffle:", error);
        }
      }
    }

    doShuffle();
  }, [isMyShuffleTurn, encryptedDeck, sendShuffle]);

  // Handle key reveal requests
  useEffect(() => {
    async function processKeyRequests() {
      if (!gameRef.current || pendingKeyRequests.length === 0) return;

      // Process each request
      const requestsToProcess = [...pendingKeyRequests];

      for (const request of requestsToProcess) {
        try {
          // Generate key reveal for this card
          const reveal = await gameRef.current.generateKeyReveal(
            request.cardPosition
          );

          // reveal is null if we're the recipient of a hole card
          if (reveal) {
            const result = await sendKeyReveal({
              cardPosition: reveal.cardPosition,
              decryptionKey: reveal.decryptionKey,
              commitment: reveal.commitment,
              salt: reveal.salt,
            });

            if (result.success) {
              console.log(`Key revealed for card ${request.cardPosition}`);
            } else {
              console.error("Failed to reveal key:", result.error);
            }
          } else {
            // We're the recipient - remove from pending since we don't need to reveal
            console.log(`Skipping key reveal for card ${request.cardPosition} - we are the recipient`);
          }
        } catch (error) {
          console.error(
            `Error revealing key for card ${request.cardPosition}:`,
            error
          );
        }
      }
    }

    processKeyRequests();
  }, [pendingKeyRequests, sendKeyReveal]);

  // Finalize deck when shuffle is complete
  useEffect(() => {
    if (
      mentalPokerPhase === "deal" &&
      gameRef.current &&
      encryptedDeck.length === 52
    ) {
      const deckAsBigInt = encryptedDeck.map((s) => BigInt(s));
      gameRef.current.finalizeDeck(deckAsBigInt);
      console.log("Deck finalized for dealing");
    }
  }, [mentalPokerPhase, encryptedDeck]);

  // Get revealed card (for UI display)
  const getRevealedCard = useCallback((cardPosition: number) => {
    if (!gameRef.current) return null;
    return gameRef.current.getRevealedCard(cardPosition);
  }, []);

  // Get all revealed cards
  const getAllRevealedCards = useCallback(() => {
    if (!gameRef.current) return new Map();
    return gameRef.current.getAllRevealedCards();
  }, []);

  // Enable Mental Poker for this table
  const enableMentalPoker = useCallback(() => {
    setMentalPokerEnabled(true);
  }, [setMentalPokerEnabled]);

  // Disable Mental Poker
  const disableMentalPoker = useCallback(() => {
    setMentalPokerEnabled(false);
  }, [setMentalPokerEnabled]);

  return {
    isEnabled: mentalPokerEnabled,
    phase: mentalPokerPhase,
    encryptedDeck,
    isMyShuffleTurn,
    pendingKeyRequests,
    getRevealedCard,
    getAllRevealedCards,
    enableMentalPoker,
    disableMentalPoker,
  };
}

export default useMentalPoker;
