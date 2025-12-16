"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/ui/Header";
import {
  useUser,
  useUserStats,
  useHandHistory,
  useTransactions,
} from "@/lib/supabase";

export default function ProfilePage() {
  const { isConnected, address } = useAccount();
  const { user, loading: userLoading, updateUsername } = useUser();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const { hands, loading: handsLoading } = useHandHistory(user?.id, 20);
  const { transactions, loading: txLoading } = useTransactions(user?.id, 20);

  const [activeTab, setActiveTab] = useState<"stats" | "history" | "transactions">("stats");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) return;
    const result = await updateUsername(newUsername.trim());
    if (result.success) {
      setIsEditingUsername(false);
      setNewUsername("");
    }
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="mb-4 text-2xl font-bold text-white">Connect Your Wallet</h2>
            <p className="text-gray-400">Connect your wallet to view your profile and statistics.</p>
          </div>
        </main>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
            <p className="text-gray-400">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-3xl font-bold text-white">
              {user?.username?.charAt(0)?.toUpperCase() || "?"}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={user?.username || "Enter username"}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-white focus:border-red-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingUsername(false);
                        setNewUsername("");
                      }}
                      className="rounded-lg bg-gray-700 px-3 py-1 text-sm font-medium text-white hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-white">
                      {user?.username || "Anonymous"}
                    </h1>
                    <button
                      onClick={() => setIsEditingUsername(true)}
                      className="rounded-lg bg-gray-800 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <p className="mt-1 font-mono text-sm text-gray-500">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2">
          <TabButton active={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
            Statistics
          </TabButton>
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
            Hand History
          </TabButton>
          <TabButton active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")}>
            Transactions
          </TabButton>
        </div>

        {/* Tab Content */}
        {activeTab === "stats" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statsLoading ? (
              <div className="col-span-full text-center text-gray-500">Loading stats...</div>
            ) : stats ? (
              <>
                <StatCard title="Hands Played" value={stats.hands_played.toLocaleString()} />
                <StatCard title="Hands Won" value={stats.hands_won.toLocaleString()} />
                <StatCard
                  title="Win Rate"
                  value={stats.hands_played > 0
                    ? `${((stats.hands_won / stats.hands_played) * 100).toFixed(1)}%`
                    : "N/A"
                  }
                />
                <StatCard
                  title="Total Won"
                  value={formatChips(stats.total_won)}
                  highlight
                />
                <StatCard title="Total Lost" value={formatChips(stats.total_lost)} />
                <StatCard
                  title="Net Profit"
                  value={formatChips((BigInt(stats.total_won) - BigInt(stats.total_lost)).toString())}
                  highlight
                />
                <StatCard title="Biggest Pot Won" value={formatChips(stats.biggest_pot_won)} />
                <StatCard title="Total Wagered" value={formatChips(stats.total_wagered)} />
                <StatCard title="Texas Hold'em Hands" value={stats.texas_holdem_hands.toLocaleString()} />
                <StatCard title="Omaha Hands" value={stats.omaha_hands.toLocaleString()} />
                <StatCard title="Tournaments Played" value={stats.tournaments_played.toLocaleString()} />
                <StatCard title="Tournaments Won" value={stats.tournaments_won.toLocaleString()} />
              </>
            ) : (
              <div className="col-span-full text-center text-gray-500">
                No statistics available yet. Play some hands to see your stats!
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
            {handsLoading ? (
              <div className="p-8 text-center text-gray-500">Loading hand history...</div>
            ) : hands.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Hand #</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Date</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Result</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Hand Rank</th>
                      <th className="p-4 text-right text-sm font-semibold text-gray-300">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hands.map((participation) => (
                      <tr key={participation.id} className="border-t border-gray-800">
                        <td className="p-4 font-mono text-sm text-white">
                          #{participation.hand?.hand_number || "?"}
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {participation.hand?.started_at
                            ? new Date(participation.hand.started_at).toLocaleString()
                            : "Unknown"}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            participation.is_winner
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {participation.is_winner ? "Won" : "Lost"}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {participation.final_hand_rank || "-"}
                        </td>
                        <td className={`p-4 text-right font-mono text-sm ${
                          BigInt(participation.net_result) >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {BigInt(participation.net_result) >= 0 ? "+" : ""}
                          {formatChips(participation.net_result)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hand history yet. Play some hands to see your history!
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
            {txLoading ? (
              <div className="p-8 text-center text-gray-500">Loading transactions...</div>
            ) : transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Date</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Type</th>
                      <th className="p-4 text-right text-sm font-semibold text-gray-300">Amount</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-gray-800">
                        <td className="p-4 text-sm text-gray-400">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            getTransactionTypeStyle(tx.type)
                          }`}>
                            {formatTransactionType(tx.type)}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-mono text-sm ${
                          isPositiveTransaction(tx.type) ? "text-green-400" : "text-red-400"
                        }`}>
                          {isPositiveTransaction(tx.type) ? "+" : "-"}
                          {formatChips(tx.amount)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 text-sm ${
                            tx.status === "confirmed" ? "text-green-400" :
                            tx.status === "pending" ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {tx.status === "confirmed" && (
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No transactions yet.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({
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

function StatCard({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-lg ${
      highlight
        ? "border-red-500/30 bg-gradient-to-br from-red-900/30 to-gray-900"
        : "border-gray-800 bg-gray-900"
    }`}>
      <p className="text-sm text-gray-400">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function formatChips(value: string): string {
  const num = BigInt(value);
  if (num >= 1000000000n) {
    return `${(Number(num) / 1000000000).toFixed(2)}B`;
  }
  if (num >= 1000000n) {
    return `${(Number(num) / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000n) {
    return `${(Number(num) / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatTransactionType(type: string): string {
  const types: Record<string, string> = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    buy_in: "Buy-In",
    cash_out: "Cash Out",
    tournament_entry: "Tournament Entry",
    tournament_prize: "Tournament Prize",
    rebuy: "Rebuy",
    addon: "Add-on",
    rake: "Rake",
  };
  return types[type] || type;
}

function getTransactionTypeStyle(type: string): string {
  const styles: Record<string, string> = {
    deposit: "bg-green-500/20 text-green-400",
    withdrawal: "bg-blue-500/20 text-blue-400",
    buy_in: "bg-yellow-500/20 text-yellow-400",
    cash_out: "bg-green-500/20 text-green-400",
    tournament_entry: "bg-purple-500/20 text-purple-400",
    tournament_prize: "bg-green-500/20 text-green-400",
    rebuy: "bg-orange-500/20 text-orange-400",
    addon: "bg-orange-500/20 text-orange-400",
    rake: "bg-red-500/20 text-red-400",
  };
  return styles[type] || "bg-gray-500/20 text-gray-400";
}

function isPositiveTransaction(type: string): boolean {
  return ["deposit", "cash_out", "tournament_prize"].includes(type);
}
