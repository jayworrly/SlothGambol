"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Header } from "@/components/ui/Header";

type PokerVariant = "texas-holdem" | "omaha" | "all";
type StakesFilter = "all" | "micro" | "low" | "mid" | "high";

interface TableInfo {
  id: string;
  name: string;
  variant: string;
  smallBlind: string;
  bigBlind: string;
  players: number;
  maxPlayers: number;
}

export default function LobbyPage() {
  const { isConnected } = useAccount();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variantFilter, setVariantFilter] = useState<PokerVariant>("all");
  const [stakesFilter, setStakesFilter] = useState<StakesFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch tables from server
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const serverUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
        const response = await fetch(`${serverUrl}/api/tables`);
        if (!response.ok) {
          throw new Error("Failed to fetch tables");
        }
        const data = await response.json();
        setTables(data.tables || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching tables:", err);
        setError("Unable to connect to game server. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
    // Refresh every 5 seconds
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStakesCategory = (bigBlind: string): StakesFilter => {
    const bb = parseFloat(bigBlind);
    if (bb <= 2) return "micro";
    if (bb <= 10) return "low";
    if (bb <= 50) return "mid";
    return "high";
  };

  const filteredTables = tables.filter((table) => {
    if (variantFilter !== "all" && table.variant !== variantFilter) {
      return false;
    }
    if (stakesFilter !== "all" && getStakesCategory(table.bigBlind) !== stakesFilter) {
      return false;
    }
    return true;
  });

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mb-4 text-2xl font-bold text-white">
              Connect Your Wallet
            </h2>
            <p className="mb-6 text-gray-400">
              Connect your wallet to access the poker tables and join the action.
            </p>
            <p className="text-sm text-gray-500">
              Click the &quot;Connect Wallet&quot; button in the header to get started.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Cash Game Lobby</h1>
            <p className="mt-1 text-gray-400">Select a table to start playing</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-red-500 hover:shadow-red-500/25"
          >
            Create Table
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex gap-2">
            <FilterButton
              active={variantFilter === "all"}
              onClick={() => setVariantFilter("all")}
            >
              All Games
            </FilterButton>
            <FilterButton
              active={variantFilter === "texas-holdem"}
              onClick={() => setVariantFilter("texas-holdem")}
            >
              Texas Hold&apos;em
            </FilterButton>
            <FilterButton
              active={variantFilter === "omaha"}
              onClick={() => setVariantFilter("omaha")}
            >
              Omaha
            </FilterButton>
          </div>

          <div className="mx-2 hidden border-l border-gray-700 sm:block" />

          <div className="flex gap-2">
            <FilterButton
              active={stakesFilter === "all"}
              onClick={() => setStakesFilter("all")}
            >
              All Stakes
            </FilterButton>
            <FilterButton
              active={stakesFilter === "micro"}
              onClick={() => setStakesFilter("micro")}
            >
              Micro
            </FilterButton>
            <FilterButton
              active={stakesFilter === "low"}
              onClick={() => setStakesFilter("low")}
            >
              Low
            </FilterButton>
            <FilterButton
              active={stakesFilter === "mid"}
              onClick={() => setStakesFilter("mid")}
            >
              Mid
            </FilterButton>
            <FilterButton
              active={stakesFilter === "high"}
              onClick={() => setStakesFilter("high")}
            >
              High
            </FilterButton>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && tables.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
              <p className="text-gray-400">Loading tables...</p>
            </div>
          </div>
        )}

        {/* Table List */}
        {!loading || tables.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-300">
                    Table Name
                  </th>
                  <th className="p-4 text-left font-semibold text-gray-300">
                    Game
                  </th>
                  <th className="p-4 text-left font-semibold text-gray-300">
                    Blinds
                  </th>
                  <th className="p-4 text-left font-semibold text-gray-300">
                    Players
                  </th>
                  <th className="p-4 text-right font-semibold text-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTables.map((table) => (
                  <tr
                    key={table.id}
                    className="border-t border-gray-800 transition-colors hover:bg-gray-800/30"
                  >
                    <td className="p-4">
                      <div className="font-medium text-white">{table.name}</div>
                      <div className="text-sm text-gray-500">ID: {table.id}</div>
                    </td>
                    <td className="p-4 text-gray-400">
                      {table.variant === "texas-holdem" ? "Hold'em" : "Omaha"}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-green-400">
                        {table.smallBlind}/{table.bigBlind}
                      </span>
                      <span className="ml-1 text-gray-500">chips</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className={`h-full transition-all ${
                              table.players === table.maxPlayers
                                ? "bg-red-500"
                                : table.players >= table.maxPlayers / 2
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${(table.players / table.maxPlayers) * 100}%` }}
                          />
                        </div>
                        <span className={table.players === table.maxPlayers ? "text-red-400" : "text-white"}>
                          {table.players}/{table.maxPlayers}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/table/${table.id}`}
                        className={`inline-block rounded-lg px-5 py-2 font-medium transition-all ${
                          table.players === table.maxPlayers
                            ? "cursor-not-allowed bg-gray-700 text-gray-500"
                            : "bg-red-600 text-white shadow-lg hover:bg-red-500 hover:shadow-red-500/25"
                        }`}
                      >
                        {table.players === table.maxPlayers ? "Full" : "Join"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTables.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">
                {tables.length === 0
                  ? "No tables available. Start the game server or create a new table."
                  : "No tables found matching your filters"}
              </div>
            )}
          </div>
        ) : null}

        {/* Server Status */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className={`h-2 w-2 rounded-full ${error ? "bg-red-500" : "bg-green-500"}`} />
          <span>{error ? "Server disconnected" : "Connected to game server"}</span>
        </div>
      </main>

      {/* Create Table Modal */}
      {showCreateModal && (
        <CreateTableModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-red-600 text-white shadow-md"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function CreateTableModal({ onClose }: { onClose: () => void }) {
  const [variant, setVariant] = useState<"texas-holdem" | "omaha">("texas-holdem");
  const [smallBlind, setSmallBlind] = useState("1");
  const [maxPlayers, setMaxPlayers] = useState(9);

  const handleCreate = () => {
    // TODO: Implement table creation via WebSocket
    console.log("Creating table:", { variant, smallBlind, maxPlayers });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h2 className="mb-6 text-2xl font-bold text-white">Create New Table</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Game Variant
            </label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as "texas-holdem" | "omaha")}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="texas-holdem">Texas Hold&apos;em</option>
              <option value="omaha">Omaha</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Small Blind (chips)
            </label>
            <input
              type="number"
              value={smallBlind}
              onChange={(e) => setSmallBlind(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Big blind will be {parseFloat(smallBlind) * 2} chips
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Max Players
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value={2}>2 (Heads Up)</option>
              <option value={6}>6 (Short Handed)</option>
              <option value={9}>9 (Full Ring)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-gray-700 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:bg-red-500 hover:shadow-red-500/25"
          >
            Create Table
          </button>
        </div>
      </div>
    </div>
  );
}
