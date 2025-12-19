"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { Header } from "@/components/ui/Header";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import {
  useGameStore,
  selectIsMyTurn,
  selectMyPlayer,
} from "@/stores/gameStore";
import {
  CommunityCards,
  PlayerSeat,
  getSeatPositions,
  ActionPanel,
  useActionShortcuts,
  HandResult,
  useHandResult,
  MentalPokerStatus,
  MentalPokerBadge,
  PotDisplay,
  TableChat,
} from "@/components/game";
import { useMentalPoker } from "@/hooks/useMentalPoker";
import { cn } from "@/lib/utils";

interface TablePageProps {
  params: Promise<{ tableId: string }>;
}

// Table configs matching the server
const TABLE_CONFIGS: Record<string, { minBuyIn: number; maxBuyIn: number; name: string; bigBlind: number }> = {
  "table-1": { minBuyIn: 40, maxBuyIn: 200, name: "Beginner Table", bigBlind: 2 },
  "table-2": { minBuyIn: 200, maxBuyIn: 1000, name: "Mid Stakes", bigBlind: 10 },
  "table-3": { minBuyIn: 1000, maxBuyIn: 5000, name: "High Roller", bigBlind: 50 },
};

export default function TablePage({ params }: TablePageProps) {
  const { tableId } = use(params);
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { address } = useAccount();
  const walletAddress = address || user?.wallet?.address;
  const { isConnected: wsConnected, joinTable, leaveTable, sendAction } = useWebSocket();
  const gameState = useGameStore();
  const isMyTurn = useGameStore(selectIsMyTurn);
  const myPlayer = useGameStore(selectMyPlayer);

  const [showSeatModal, setShowSeatModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tableConfig = TABLE_CONFIGS[tableId] || { minBuyIn: 40, maxBuyIn: 200, name: "Unknown", bigBlind: 2 };
  const [buyInAmount, setBuyInAmount] = useState(tableConfig.minBuyIn.toString());

  const isSeated = gameState.myPosition !== null;

  // Mental Poker integration
  const mentalPoker = useMentalPoker();

  // Hand result
  const handResult = useHandResult();

  // Keyboard shortcuts
  useActionShortcuts(
    isMyTurn,
    gameState.availableActions,
    handleAction,
    myPlayer?.stack || 0n
  );

  // Handle seat selection
  const handleSeatClick = (seatNumber: number) => {
    const player = gameState.players.find((p) => p.position === seatNumber);
    if (player) return;

    setSelectedSeat(seatNumber);
    setShowSeatModal(true);
  };

  // Join the table
  const handleJoinTable = async () => {
    if (selectedSeat === null) return;

    setJoining(true);
    setError(null);

    try {
      const result = await joinTable(tableId, selectedSeat, buyInAmount);
      if (result.success) {
        setShowSeatModal(false);
        setSelectedSeat(null);
      } else {
        setError(result.error || "Failed to join table");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  // Leave the table
  const handleLeaveTable = async () => {
    await leaveTable();
    router.push("/lobby");
  };

  // Game actions
  function handleAction(action: string, amount?: string) {
    if (!isMyTurn) return;
    sendAction(action, amount);
  }

  // Show hand result when game ends
  useEffect(() => {
    if (gameState.phase === "showdown") {
      // This would be populated from server event
      // For now, we'll rely on the server to send hand-result event
    }
  }, [gameState.phase]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="text-gray-400">Loading...</div>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-white">
              Connect Your Wallet
            </h2>
            <p className="mb-6 text-gray-400">
              Please connect your wallet to join the table and play.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Header />

      <main className="flex flex-1 flex-col">
        {/* Table Info Bar */}
        <div className="border-b border-gray-800 bg-gray-900/50 px-4 py-2">
          <div className="container mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">
                <span className="font-medium text-white">{tableConfig.name}</span>
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">
                Phase: <span className="capitalize text-yellow-400">{gameState.phase}</span>
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">
                Hand: <span className="text-white">#{gameState.handNumber}</span>
              </span>
              <span className="text-gray-600">|</span>
              <span className={cn(
                "flex items-center gap-1",
                wsConnected ? "text-green-400" : "text-red-400"
              )}>
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  wsConnected ? "bg-green-500" : "bg-red-500"
                )} />
                {wsConnected ? "Connected" : "Disconnected"}
              </span>
              {mentalPoker.isEnabled && (
                <>
                  <span className="text-gray-600">|</span>
                  <MentalPokerBadge enabled={mentalPoker.isEnabled} phase={mentalPoker.phase} />
                </>
              )}
            </div>
            <div className="flex gap-4">
              {isSeated && (
                <button
                  onClick={handleLeaveTable}
                  className="text-red-400 transition-colors hover:text-red-300"
                >
                  Leave Table
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Poker Table */}
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="relative aspect-[16/10] w-full max-w-5xl">
            {/* Table Surface */}
            <div
              className="absolute inset-0 shadow-2xl"
              style={{
                borderRadius: "150px",
                background: "linear-gradient(145deg, #5c4a3a, #3d3128)",
                padding: "1.5rem",
              }}
            >
              <div
                className="relative h-full w-full"
                style={{
                  borderRadius: "130px",
                  background: "linear-gradient(145deg, #1a5a3a, #0d3d25)",
                  boxShadow: "inset 0 0 60px rgba(0,0,0,0.5)",
                }}
              >
                {/* Inner rail */}
                <div
                  className="absolute inset-4 border-2 border-yellow-600/20"
                  style={{ borderRadius: "110px" }}
                />
              </div>
            </div>

            {/* Pot Display */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <PotDisplay
                pot={gameState.pot}
                currentBet={gameState.currentBet}
              />
            </div>

            {/* Community Cards */}
            <div className="absolute left-1/2 top-[28%] -translate-x-1/2">
              <CommunityCards cards={gameState.communityCards} />
            </div>

            {/* Player Seats */}
            {getSeatPositions(9).map((pos, index) => {
              const player = gameState.players.find((p) => p.position === index);
              const playerData = player ? {
                id: player.id,
                username: player.username,
                walletAddress: player.walletAddress,
                stack: player.stack,
                currentBet: player.currentBet,
                isDealer: player.isDealer,
                isSmallBlind: player.isSmallBlind,
                isBigBlind: player.isBigBlind,
                isTurn: player.isTurn,
                isFolded: player.isFolded,
                isAllIn: player.isAllIn,
              } : undefined;

              return (
                <PlayerSeat
                  key={index}
                  position={index}
                  style={pos}
                  player={playerData}
                  isCurrentActor={gameState.currentActorPosition === index}
                  isMe={gameState.myPosition === index}
                  myCards={gameState.myPosition === index ? gameState.myHoleCards : undefined}
                  onSeatClick={() => handleSeatClick(index)}
                  actionDeadline={gameState.currentActorPosition === index ? gameState.actionDeadline : null}
                />
              );
            })}
          </div>
        </div>

        {/* Action Panel */}
        {isSeated ? (
          <ActionPanel
            isMyTurn={isMyTurn}
            availableActions={gameState.availableActions}
            currentBet={gameState.currentBet}
            myBet={myPlayer?.currentBet || 0n}
            myStack={myPlayer?.stack || 0n}
            onAction={handleAction}
            actionDeadline={gameState.actionDeadline}
            bigBlind={BigInt(tableConfig.bigBlind)}
            pot={gameState.pot}
            gamePhase={gameState.phase}
            playerCount={gameState.players.length}
            minPlayers={2}
          />
        ) : (
          <div className="border-t border-gray-800 bg-gray-900/50 p-4">
            <div className="container mx-auto text-center text-gray-400">
              Click on an empty seat to join the table
            </div>
          </div>
        )}
      </main>

      {/* Table Chat */}
      {isSeated && <TableChat />}

      {/* Mental Poker Status Panel */}
      <MentalPokerStatus
        enabled={mentalPoker.isEnabled}
        phase={mentalPoker.phase}
        commitmentsReceived={gameState.commitmentsReceived}
        totalPlayers={gameState.players.length}
        currentShuffler={gameState.currentShuffler}
        isMyShuffleTurn={mentalPoker.isMyShuffleTurn}
        pendingKeyRequests={mentalPoker.pendingKeyRequests.length}
      />

      {/* Hand Result Overlay */}
      <HandResult
        show={handResult.show}
        winners={handResult.winners}
        pots={handResult.pots}
        onClose={handResult.hideResult}
      />

      {/* Seat Selection Modal */}
      {showSeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-white">
              Take Seat {(selectedSeat ?? 0) + 1}
            </h2>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">
                  Buy-in Amount (chips)
                </label>
                <input
                  type="number"
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(e.target.value)}
                  min={tableConfig.minBuyIn}
                  max={tableConfig.maxBuyIn}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Min: {tableConfig.minBuyIn} | Max: {tableConfig.maxBuyIn}
                </p>
              </div>

              {/* Quick buy-in buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setBuyInAmount(tableConfig.minBuyIn.toString())}
                  className="flex-1 rounded bg-gray-700 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Min
                </button>
                <button
                  onClick={() => setBuyInAmount(Math.floor((tableConfig.minBuyIn + tableConfig.maxBuyIn) / 2).toString())}
                  className="flex-1 rounded bg-gray-700 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Half
                </button>
                <button
                  onClick={() => setBuyInAmount(tableConfig.maxBuyIn.toString())}
                  className="flex-1 rounded bg-gray-700 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Max
                </button>
              </div>

              <div className="rounded-lg bg-gray-800 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Your Wallet</span>
                  <span className="font-mono text-white">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  setShowSeatModal(false);
                  setSelectedSeat(null);
                  setError(null);
                }}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-600"
                disabled={joining}
              >
                Cancel
              </button>
              <button
                onClick={handleJoinTable}
                disabled={joining || !buyInAmount}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:bg-green-500 disabled:opacity-50"
              >
                {joining ? "Joining..." : "Sit Down"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
