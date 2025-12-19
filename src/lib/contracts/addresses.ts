// Contract addresses for ChipVault on different networks
export const CHIP_VAULT_ADDRESSES = {
  // Avalanche Fuji Testnet
  43113: "0x4168d40F0B2906495510517646a8FB406cfbB38b" as const,
  // Avalanche Mainnet (not deployed yet)
  43114: "" as const,
} as const;

export type SupportedChainId = keyof typeof CHIP_VAULT_ADDRESSES;

export function getChipVaultAddress(chainId: number): `0x${string}` | null {
  const address = CHIP_VAULT_ADDRESSES[chainId as SupportedChainId];
  if (!address) return null;
  return address as `0x${string}`;
}
