"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ChipVaultABI } from "./abis/ChipVault";
import { getChipVaultAddress } from "./addresses";

// Hook to get available balance (can be withdrawn)
export function useAvailableBalance(playerAddress: `0x${string}` | undefined, chainId: number | undefined) {
  const contractAddress = chainId ? getChipVaultAddress(chainId) : null;

  return useReadContract({
    address: contractAddress ?? undefined,
    abi: ChipVaultABI,
    functionName: "getAvailableBalance",
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!playerAddress,
    },
  });
}

// Hook to get locked balance (in active games)
export function useLockedBalance(playerAddress: `0x${string}` | undefined, chainId: number | undefined) {
  const contractAddress = chainId ? getChipVaultAddress(chainId) : null;

  return useReadContract({
    address: contractAddress ?? undefined,
    abi: ChipVaultABI,
    functionName: "getLockedBalance",
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!playerAddress,
    },
  });
}

// Hook to get total balance (available + locked)
export function useTotalBalance(playerAddress: `0x${string}` | undefined, chainId: number | undefined) {
  const contractAddress = chainId ? getChipVaultAddress(chainId) : null;

  return useReadContract({
    address: contractAddress ?? undefined,
    abi: ChipVaultABI,
    functionName: "getTotalBalance",
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!playerAddress,
    },
  });
}

// Hook to check if contract is paused
export function useContractPaused(chainId: number | undefined) {
  const contractAddress = chainId ? getChipVaultAddress(chainId) : null;

  return useReadContract({
    address: contractAddress ?? undefined,
    abi: ChipVaultABI,
    functionName: "paused",
    query: {
      enabled: !!contractAddress,
    },
  });
}

// Hook for depositing AVAX
export function useDeposit() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (chainId: number, amount: string) => {
    const contractAddress = getChipVaultAddress(chainId);
    if (!contractAddress) {
      throw new Error("Contract not deployed on this network");
    }

    writeContract({
      address: contractAddress,
      abi: ChipVaultABI,
      functionName: "deposit",
      value: parseEther(amount),
    });
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// Hook for withdrawing AVAX
export function useWithdraw() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = async (chainId: number, amount: string) => {
    const contractAddress = getChipVaultAddress(chainId);
    if (!contractAddress) {
      throw new Error("Contract not deployed on this network");
    }

    writeContract({
      address: contractAddress,
      abi: ChipVaultABI,
      functionName: "withdraw",
      args: [parseEther(amount)],
    });
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// Helper to format balance from bigint to string
export function formatBalance(balance: bigint | undefined): string {
  if (!balance) return "0";
  return formatEther(balance);
}
