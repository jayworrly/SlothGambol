"use client";

import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { Header } from "@/components/ui/Header";
import { avalanche, avalancheFuji } from "wagmi/chains";

export default function CashierPage() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="bg-background border-secondary-accent max-w-md rounded-xl border p-8 text-center shadow-xl">
            <h2 className="text-primary-text mb-4 text-2xl font-bold">
              Connect Your Wallet
            </h2>
            <p className="text-foreground/70 mb-6">
              Please connect your crypto wallet to access the cashier.
            </p>
            <p className="text-foreground/50 text-sm">
              Click the "Connect Wallet" button in the header to get started.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Mock poker balance - will be fetched from contract
  const pokerBalance = "5.25";

  const handleDeposit = () => {
    // TODO: Implement deposit via ChipVault contract
    console.log("Depositing:", amount);
  };

  const handleWithdraw = () => {
    // TODO: Implement withdrawal via ChipVault contract
    console.log("Withdrawing:", amount);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-primary-text mb-8 text-3xl font-bold">Cashier</h1>

        {/* Balances */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="bg-background/50 border-secondary-accent rounded-xl border p-6">
            <p className="text-foreground/70 mb-1 text-sm">Wallet Balance</p>
            <p className="text-primary-text text-2xl font-bold">
              {balance ? parseFloat(balance.formatted).toFixed(4) : "0"} AVAX
            </p>
          </div>
          <div className="bg-background/50 border-secondary-accent rounded-xl border p-6">
            <p className="text-foreground/70 mb-1 text-sm">Poker Balance</p>
            <p className="text-2xl font-bold text-green-400">
              {pokerBalance} AVAX
            </p>
          </div>
        </div>

        {/* Network Warning */}
        {chain?.id !== avalanche.id && chain?.id !== avalancheFuji.id && (
          <div className="bg-gold/10 border-gold/50 mb-6 rounded-xl border p-4">
            <p className="text-gold text-sm">
              Please switch to Avalanche network to deposit or withdraw funds.
            </p>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 rounded-lg py-3 font-semibold transition-colors ${
              activeTab === "deposit"
                ? "bg-green-500 text-white"
                : "bg-secondary-accent/30 text-foreground/70 hover:text-primary-text"
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 rounded-lg py-3 font-semibold transition-colors ${
              activeTab === "withdraw"
                ? "bg-avalanche-red text-white"
                : "bg-secondary-accent/30 text-foreground/70 hover:text-primary-text"
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Form */}
        <div className="bg-background/50 border-secondary-accent rounded-xl border p-6">
          <div className="mb-6">
            <label className="text-foreground/70 mb-2 block text-sm font-medium">
              Amount (AVAX)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="bg-secondary-accent/30 border-secondary-accent text-primary-text w-full rounded-lg border p-4 pr-20 text-lg"
              />
              <button
                onClick={() => {
                  if (activeTab === "deposit" && balance) {
                    setAmount(balance.formatted);
                  } else {
                    setAmount(pokerBalance);
                  }
                }}
                className="bg-secondary-accent/50 hover:bg-secondary-accent/70 text-primary-text absolute top-1/2 right-2 -translate-y-1/2 rounded px-3 py-1 text-sm transition-colors"
              >
                Max
              </button>
            </div>
            <p className="text-foreground/60 mt-2 text-sm">
              Available:{" "}
              {activeTab === "deposit"
                ? `${balance ? parseFloat(balance.formatted).toFixed(4) : "0"} AVAX`
                : `${pokerBalance} AVAX`}
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="mb-6 flex gap-2">
            {["0.1", "0.5", "1", "5"].map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount)}
                className="bg-secondary-accent/30 hover:bg-secondary-accent/50 text-primary-text flex-1 rounded-lg py-2 text-sm transition-colors"
              >
                {quickAmount} AVAX
              </button>
            ))}
          </div>

          {activeTab === "deposit" ? (
            <button
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0}
              className="disabled:bg-secondary-accent/50 text-primary-text w-full rounded-lg bg-green-500 py-4 text-lg font-semibold transition-colors hover:bg-green-600 disabled:cursor-not-allowed"
            >
              Deposit to Poker
            </button>
          ) : (
            <div>
              <button
                onClick={handleWithdraw}
                disabled={!amount || parseFloat(amount) <= 0}
                className="bg-avalanche-red hover:bg-avalanche-red/80 disabled:bg-secondary-accent/50 text-primary-text w-full rounded-lg py-4 text-lg font-semibold transition-colors disabled:cursor-not-allowed"
              >
                Request Withdrawal
              </button>
              <p className="text-foreground/60 mt-3 text-center text-sm">
                Withdrawals have a 1 hour security delay
              </p>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-background/50 border-secondary-accent mt-8 rounded-xl border p-6">
          <h2 className="text-primary-text mb-4 text-xl font-semibold">
            Transaction History
          </h2>
          <div className="text-foreground/60 py-8 text-center">
            No transactions yet
          </div>
        </div>
      </main>
    </div>
  );
}
