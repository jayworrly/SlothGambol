"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { Header } from "@/components/ui/Header";
import { avalanche, avalancheFuji } from "wagmi/chains";
import {
  useAvailableBalance,
  useLockedBalance,
  useDeposit,
  useWithdraw,
  formatBalance,
  useContractPaused,
} from "@/lib/contracts/hooks";
import { getChipVaultAddress } from "@/lib/contracts/addresses";

export default function CashierPage() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletBalance, refetch: refetchWalletBalance } = useBalance({ address });
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");

  // Contract reads
  const { data: availableBalance, refetch: refetchAvailable } = useAvailableBalance(
    address,
    chain?.id
  );
  const { data: lockedBalance, refetch: refetchLocked } = useLockedBalance(
    address,
    chain?.id
  );
  const { data: isPaused } = useContractPaused(chain?.id);

  // Contract writes
  const {
    deposit,
    isPending: isDepositing,
    isConfirming: isDepositConfirming,
    isSuccess: isDepositSuccess,
    error: depositError,
    reset: resetDeposit,
  } = useDeposit();

  const {
    withdraw,
    isPending: isWithdrawing,
    isConfirming: isWithdrawConfirming,
    isSuccess: isWithdrawSuccess,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWithdraw();

  // Check if contract is deployed on current network
  const contractAddress = chain?.id ? getChipVaultAddress(chain.id) : null;
  const isValidNetwork = chain?.id === avalanche.id || chain?.id === avalancheFuji.id;
  const isContractAvailable = !!contractAddress;

  // Format balances for display
  const pokerBalance = formatBalance(availableBalance);
  const lockedBalanceDisplay = formatBalance(lockedBalance);

  // Refetch balances on successful transaction
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      refetchAvailable();
      refetchLocked();
      refetchWalletBalance();
      setAmount("");
    }
  }, [isDepositSuccess, isWithdrawSuccess, refetchAvailable, refetchLocked, refetchWalletBalance]);

  // Reset errors when switching tabs
  useEffect(() => {
    resetDeposit();
    resetWithdraw();
  }, [activeTab, resetDeposit, resetWithdraw]);

  const handleDeposit = async () => {
    if (!chain?.id || !amount) return;
    try {
      await deposit(chain.id, amount);
    } catch (err) {
      console.error("Deposit error:", err);
    }
  };

  const handleWithdraw = async () => {
    if (!chain?.id || !amount) return;
    try {
      await withdraw(chain.id, amount);
    } catch (err) {
      console.error("Withdraw error:", err);
    }
  };

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
              Click the &quot;Connect Wallet&quot; button in the header to get started.
            </p>
          </div>
        </main>
      </div>
    );
  }

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
              {walletBalance ? parseFloat(walletBalance.formatted).toFixed(4) : "0"} AVAX
            </p>
          </div>
          <div className="bg-background/50 border-secondary-accent rounded-xl border p-6">
            <p className="text-foreground/70 mb-1 text-sm">Poker Balance</p>
            <p className="text-2xl font-bold text-green-400">
              {parseFloat(pokerBalance).toFixed(4)} AVAX
            </p>
            {parseFloat(lockedBalanceDisplay) > 0 && (
              <p className="text-foreground/50 mt-1 text-xs">
                ({parseFloat(lockedBalanceDisplay).toFixed(4)} locked in games)
              </p>
            )}
          </div>
        </div>

        {/* Network Warning */}
        {!isValidNetwork && (
          <div className="bg-gold/10 border-gold/50 mb-6 rounded-xl border p-4">
            <p className="text-gold text-sm">
              Please switch to Avalanche network to deposit or withdraw funds.
            </p>
          </div>
        )}

        {/* Contract Not Deployed Warning */}
        {isValidNetwork && !isContractAvailable && (
          <div className="bg-gold/10 border-gold/50 mb-6 rounded-xl border p-4">
            <p className="text-gold text-sm">
              ChipVault contract is not deployed on this network yet.
            </p>
          </div>
        )}

        {/* Contract Paused Warning */}
        {isPaused && (
          <div className="border-avalanche-red/50 bg-avalanche-red/10 mb-6 rounded-xl border p-4">
            <p className="text-avalanche-red text-sm">
              Contract is currently paused. Deposits and withdrawals are temporarily disabled.
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
                min="0.01"
                className="bg-secondary-accent/30 border-secondary-accent text-primary-text w-full rounded-lg border p-4 pr-20 text-lg"
              />
              <button
                onClick={() => {
                  if (activeTab === "deposit" && walletBalance) {
                    // Leave a bit for gas
                    const maxDeposit = Math.max(0, parseFloat(walletBalance.formatted) - 0.01);
                    setAmount(maxDeposit.toFixed(4));
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
                ? `${walletBalance ? parseFloat(walletBalance.formatted).toFixed(4) : "0"} AVAX`
                : `${parseFloat(pokerBalance).toFixed(4)} AVAX`}
            </p>
            <p className="text-foreground/50 mt-1 text-xs">
              Min deposit: 0.01 AVAX • Max deposit: 1000 AVAX
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

          {/* Success Message */}
          {(isDepositSuccess || isWithdrawSuccess) && (
            <div className="mb-4 rounded-lg bg-green-500/20 p-3 text-center text-green-400">
              {isDepositSuccess ? "Deposit successful!" : "Withdrawal successful!"}
            </div>
          )}

          {/* Error Message */}
          {(depositError || withdrawError) && (
            <div className="border-avalanche-red/50 bg-avalanche-red/10 text-avalanche-red mb-4 rounded-lg border p-3 text-center text-sm">
              {depositError?.message || withdrawError?.message || "Transaction failed"}
            </div>
          )}

          {activeTab === "deposit" ? (
            <button
              onClick={handleDeposit}
              disabled={
                !amount ||
                parseFloat(amount) < 0.01 ||
                isDepositing ||
                isDepositConfirming ||
                isPaused ||
                !isContractAvailable
              }
              className="disabled:bg-secondary-accent/50 text-primary-text w-full rounded-lg bg-green-500 py-4 text-lg font-semibold transition-colors hover:bg-green-600 disabled:cursor-not-allowed"
            >
              {isDepositing
                ? "Confirm in Wallet..."
                : isDepositConfirming
                  ? "Processing..."
                  : "Deposit to Poker"}
            </button>
          ) : (
            <div>
              <button
                onClick={handleWithdraw}
                disabled={
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > parseFloat(pokerBalance) ||
                  isWithdrawing ||
                  isWithdrawConfirming ||
                  isPaused ||
                  !isContractAvailable
                }
                className="bg-avalanche-red hover:bg-avalanche-red/80 disabled:bg-secondary-accent/50 text-primary-text w-full rounded-lg py-4 text-lg font-semibold transition-colors disabled:cursor-not-allowed"
              >
                {isWithdrawing
                  ? "Confirm in Wallet..."
                  : isWithdrawConfirming
                    ? "Processing..."
                    : "Withdraw to Wallet"}
              </button>
            </div>
          )}
        </div>

        {/* Contract Info */}
        {isContractAvailable && (
          <div className="bg-background/30 mt-8 rounded-xl p-4 text-center">
            <p className="text-foreground/50 text-xs">
              ChipVault Contract:{" "}
              <a
                href={`https://${chain?.id === avalancheFuji.id ? "testnet." : ""}snowtrace.io/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/70 hover:text-primary-text underline"
              >
                {contractAddress?.slice(0, 6)}...{contractAddress?.slice(-4)}
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
