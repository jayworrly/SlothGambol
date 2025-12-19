"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { Header } from "@/components/ui/Header";
import { avalancheFuji } from "wagmi/chains";
import {
  useAvailableBalance,
  useDeposit,
  formatBalance,
} from "@/lib/contracts/hooks";
import { getChipVaultAddress } from "@/lib/contracts/addresses";

const FAUCET_AMOUNTS = [
  { chips: "100", avax: "0.1", label: "100 Chips" },
  { chips: "500", avax: "0.5", label: "500 Chips" },
  { chips: "1,000", avax: "1", label: "1K Chips" },
  { chips: "5,000", avax: "5", label: "5K Chips" },
];

const COOLDOWN_KEY = "faucet_last_claim";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export default function FaucetPage() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletBalance, refetch: refetchWalletBalance } = useBalance({ address });
  const [selectedAmount, setSelectedAmount] = useState(FAUCET_AMOUNTS[1]);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const { data: availableBalance, refetch: refetchAvailable } = useAvailableBalance(
    address,
    chain?.id
  );

  const {
    deposit,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  } = useDeposit();

  const contractAddress = chain?.id ? getChipVaultAddress(chain.id) : null;
  const isValidNetwork = chain?.id === avalancheFuji.id;
  const pokerBalance = formatBalance(availableBalance);

  // Check cooldown
  useEffect(() => {
    const checkCooldown = () => {
      const lastClaim = localStorage.getItem(COOLDOWN_KEY);
      if (lastClaim) {
        const elapsed = Date.now() - parseInt(lastClaim);
        const remaining = Math.max(0, COOLDOWN_MS - elapsed);
        setCooldownRemaining(remaining);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle successful claim
  useEffect(() => {
    if (isSuccess) {
      localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      setCooldownRemaining(COOLDOWN_MS);
      refetchAvailable();
      refetchWalletBalance();
    }
  }, [isSuccess, refetchAvailable, refetchWalletBalance]);

  const handleClaim = async () => {
    if (!chain?.id || cooldownRemaining > 0) return;
    reset();
    try {
      await deposit(chain.id, selectedAmount.avax);
    } catch (err) {
      console.error("Claim error:", err);
    }
  };

  const formatCooldown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const hasEnoughAvax = walletBalance && parseFloat(walletBalance.formatted) >= parseFloat(selectedAmount.avax);

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border border-purple-500/20 bg-gray-900/80 p-8 text-center backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-4 text-2xl font-bold text-white">
              Connect Your Wallet
            </h2>
            <p className="text-gray-400">
              Connect your wallet to claim free test chips.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container mx-auto max-w-lg flex-1 px-4 py-8">
        {/* Testnet Badge */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400">
            Avalanche Fuji Testnet
          </span>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Chip Faucet
          </h1>
          <p className="text-gray-400">
            Get free test chips to play poker
          </p>
        </div>

        {/* Current Balance */}
        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-gray-900/50 p-6 text-center backdrop-blur-sm">
          <p className="mb-1 text-sm text-gray-400">Your Chip Balance</p>
          <p className="text-4xl font-bold text-white">
            {(parseFloat(pokerBalance) * 1000).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500">chips</p>
        </div>

        {/* Network Warning */}
        {!isValidNetwork && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <p className="font-medium text-amber-400">
              Please switch to Avalanche Fuji Testnet
            </p>
          </div>
        )}

        {/* Step 1: Get Test AVAX */}
        <div className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
              1
            </div>
            <h3 className="text-lg font-semibold text-white">Get Test AVAX</h3>
          </div>

          <p className="mb-4 text-sm text-gray-400">
            You need test AVAX to claim chips. Get free AVAX from the official faucet.
          </p>

          <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800/50 p-3">
            <span className="text-sm text-gray-400">Your AVAX Balance:</span>
            <span className="font-mono font-medium text-white">
              {walletBalance ? parseFloat(walletBalance.formatted).toFixed(4) : "0"} AVAX
            </span>
          </div>

          <a
            href="https://core.app/tools/testnet-faucet/?subnet=c&token=c"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 py-3 font-semibold text-white transition-all hover:from-red-600 hover:to-red-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Get Free Test AVAX
          </a>
        </div>

        {/* Step 2: Claim Chips */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
              2
            </div>
            <h3 className="text-lg font-semibold text-white">Claim Chips</h3>
          </div>

          {/* Amount Selection */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            {FAUCET_AMOUNTS.map((amount) => (
              <button
                key={amount.avax}
                onClick={() => setSelectedAmount(amount)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${
                  selectedAmount.avax === amount.avax
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                }`}
              >
                <div className="text-lg font-bold text-white">{amount.label}</div>
                <div className="text-sm text-gray-400">{amount.avax} AVAX</div>
              </button>
            ))}
          </div>

          {/* Success Message */}
          {isSuccess && (
            <div className="mb-4 rounded-lg bg-green-500/20 p-3 text-center text-green-400">
              Successfully claimed {selectedAmount.chips} chips!
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error.message || "Failed to claim chips"}
            </div>
          )}

          {/* Claim Button */}
          <button
            onClick={handleClaim}
            disabled={
              !isValidNetwork ||
              !contractAddress ||
              !hasEnoughAvax ||
              isPending ||
              isConfirming ||
              cooldownRemaining > 0
            }
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 py-4 text-lg font-bold text-white transition-all hover:from-purple-600 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              "Confirm in Wallet..."
            ) : isConfirming ? (
              "Processing..."
            ) : cooldownRemaining > 0 ? (
              `Cooldown: ${formatCooldown(cooldownRemaining)}`
            ) : !hasEnoughAvax ? (
              "Need More AVAX"
            ) : (
              `Claim ${selectedAmount.chips} Chips`
            )}
          </button>

          {!hasEnoughAvax && isValidNetwork && (
            <p className="mt-2 text-center text-sm text-amber-400">
              You need at least {selectedAmount.avax} AVAX to claim
            </p>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>1 chip = 0.001 AVAX on testnet</p>
          <p className="mt-1">Cooldown: 1 hour between claims</p>
        </div>
      </main>
    </div>
  );
}
