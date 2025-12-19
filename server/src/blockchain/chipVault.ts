import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type PublicClient,
  type WalletClient,
  type Chain,
  keccak256,
  toBytes,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche, avalancheFuji } from 'viem/chains';

// ChipVault ABI - only the functions we need
const ChipVaultABI = [
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getAvailableBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getLockedBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getTotalBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tableId', type: 'bytes32' },
      { name: 'player', type: 'address' },
    ],
    name: 'getTableLockedAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'tableId', type: 'bytes32' },
    ],
    name: 'lockChips',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'tableId', type: 'bytes32' },
    ],
    name: 'unlockChips',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tableId', type: 'bytes32' },
      { name: 'players', type: 'address[]' },
      { name: 'deltas', type: 'int256[]' },
    ],
    name: 'settleTable',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'authorizedServers',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Contract addresses by chain ID
const CHIP_VAULT_ADDRESSES: Record<number, `0x${string}` | null> = {
  43113: '0x4168d40F0B2906495510517646a8FB406cfbB38b', // Avalanche Fuji
  43114: null, // Avalanche Mainnet - not deployed yet
};

interface ChipVaultServiceConfig {
  chainId: number;
  rpcUrl?: string;
  privateKey?: string;
}

class ChipVaultService {
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private contractAddress: `0x${string}` | null = null;
  private chain: Chain | null = null;
  private initialized = false;
  private serverAddress: `0x${string}` | null = null;

  initialize(config?: ChipVaultServiceConfig): boolean {
    const chainId = config?.chainId || parseInt(process.env.CHAIN_ID || '43113');
    const privateKey = config?.privateKey || process.env.SERVER_PRIVATE_KEY;
    const rpcUrl = config?.rpcUrl || process.env.RPC_URL;

    // Get contract address for chain
    this.contractAddress = CHIP_VAULT_ADDRESSES[chainId] || null;
    if (!this.contractAddress) {
      console.warn(`⚠️  ChipVault not deployed on chain ${chainId} - blockchain features disabled`);
      return false;
    }

    // Determine chain
    this.chain = chainId === 43114 ? avalanche : avalancheFuji;

    // Create public client for reads
    const transport = rpcUrl ? http(rpcUrl) : http();
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport,
    });

    // Create wallet client for writes (if private key available)
    if (privateKey) {
      try {
        const formattedKey = privateKey.startsWith('0x')
          ? privateKey as `0x${string}`
          : `0x${privateKey}` as `0x${string}`;
        const account = privateKeyToAccount(formattedKey);
        this.serverAddress = account.address;

        this.walletClient = createWalletClient({
          account,
          chain: this.chain,
          transport,
        });

        this.initialized = true;
        console.log(`✅ ChipVault service initialized`);
        console.log(`   Chain: ${this.chain.name} (${chainId})`);
        console.log(`   Contract: ${this.contractAddress}`);
        console.log(`   Server wallet: ${this.serverAddress}`);
        return true;
      } catch (error) {
        console.error('❌ Failed to create wallet client:', error);
        return false;
      }
    } else {
      console.warn('⚠️  SERVER_PRIVATE_KEY not set - write operations disabled');
      console.log('   Read operations available via public client');
      return true;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  canWrite(): boolean {
    return this.walletClient !== null;
  }

  getServerAddress(): `0x${string}` | null {
    return this.serverAddress;
  }

  /**
   * Convert table ID string to bytes32
   */
  tableIdToBytes32(tableId: string): `0x${string}` {
    return keccak256(toBytes(tableId));
  }

  /**
   * Check if server is authorized on the contract
   */
  async isServerAuthorized(): Promise<boolean> {
    if (!this.publicClient || !this.contractAddress || !this.serverAddress) {
      return false;
    }

    try {
      const isAuthorized = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'authorizedServers',
        args: [this.serverAddress],
      });
      return isAuthorized;
    } catch (error) {
      console.error('Error checking server authorization:', error);
      return false;
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    if (!this.publicClient || !this.contractAddress) {
      return true;
    }

    try {
      return await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'paused',
      });
    } catch (error) {
      console.error('Error checking paused status:', error);
      return true;
    }
  }

  /**
   * Get player's available balance
   */
  async getAvailableBalance(playerAddress: `0x${string}`): Promise<bigint> {
    if (!this.publicClient || !this.contractAddress) {
      return 0n;
    }

    try {
      return await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'getAvailableBalance',
        args: [playerAddress],
      });
    } catch (error) {
      console.error('Error getting available balance:', error);
      return 0n;
    }
  }

  /**
   * Get player's locked balance
   */
  async getLockedBalance(playerAddress: `0x${string}`): Promise<bigint> {
    if (!this.publicClient || !this.contractAddress) {
      return 0n;
    }

    try {
      return await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'getLockedBalance',
        args: [playerAddress],
      });
    } catch (error) {
      console.error('Error getting locked balance:', error);
      return 0n;
    }
  }

  /**
   * Lock chips when player joins a table
   */
  async lockChips(
    playerAddress: `0x${string}`,
    amount: bigint,
    tableId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletClient || !this.contractAddress) {
      return { success: false, error: 'Wallet client not initialized' };
    }

    try {
      const tableIdBytes32 = this.tableIdToBytes32(tableId);

      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'lockChips',
        args: [playerAddress, amount, tableIdBytes32],
        chain: this.chain,
      });

      // Wait for confirmation
      if (this.publicClient) {
        await this.publicClient.waitForTransactionReceipt({ hash });
      }

      console.log(`✅ Locked ${formatEther(amount)} AVAX for ${playerAddress} at table ${tableId}`);
      return { success: true, txHash: hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error locking chips:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Unlock chips when player leaves a table (without settlement)
   */
  async unlockChips(
    playerAddress: `0x${string}`,
    amount: bigint,
    tableId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletClient || !this.contractAddress) {
      return { success: false, error: 'Wallet client not initialized' };
    }

    try {
      const tableIdBytes32 = this.tableIdToBytes32(tableId);

      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'unlockChips',
        args: [playerAddress, amount, tableIdBytes32],
        chain: this.chain,
      });

      // Wait for confirmation
      if (this.publicClient) {
        await this.publicClient.waitForTransactionReceipt({ hash });
      }

      console.log(`✅ Unlocked ${formatEther(amount)} AVAX for ${playerAddress} from table ${tableId}`);
      return { success: true, txHash: hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error unlocking chips:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Settle a table - apply win/loss deltas to all players
   * @param tableId Table identifier
   * @param players Array of player addresses
   * @param deltas Array of balance changes (positive = won, negative = lost)
   */
  async settleTable(
    tableId: string,
    players: `0x${string}`[],
    deltas: bigint[]
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletClient || !this.contractAddress) {
      return { success: false, error: 'Wallet client not initialized' };
    }

    if (players.length !== deltas.length) {
      return { success: false, error: 'Players and deltas arrays must have same length' };
    }

    // Verify zero-sum
    const sum = deltas.reduce((acc, delta) => acc + delta, 0n);
    if (sum !== 0n) {
      return { success: false, error: 'Deltas must sum to zero' };
    }

    try {
      const tableIdBytes32 = this.tableIdToBytes32(tableId);

      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'settleTable',
        args: [tableIdBytes32, players, deltas],
        chain: this.chain,
      });

      // Wait for confirmation
      if (this.publicClient) {
        await this.publicClient.waitForTransactionReceipt({ hash });
      }

      console.log(`✅ Settled table ${tableId} for ${players.length} players`);
      return { success: true, txHash: hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error settling table:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get player's locked amount at a specific table
   */
  async getTableLockedAmount(
    tableId: string,
    playerAddress: `0x${string}`
  ): Promise<bigint> {
    if (!this.publicClient || !this.contractAddress) {
      return 0n;
    }

    try {
      const tableIdBytes32 = this.tableIdToBytes32(tableId);
      return await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ChipVaultABI,
        functionName: 'getTableLockedAmount',
        args: [tableIdBytes32, playerAddress],
      });
    } catch (error) {
      console.error('Error getting table locked amount:', error);
      return 0n;
    }
  }
}

// Export singleton instance
export const chipVault = new ChipVaultService();
