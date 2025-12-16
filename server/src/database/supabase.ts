import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Simple type definitions for server use
// (Using any for JSON fields to avoid circular type imports)

export interface DbUser {
  id: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  is_banned: boolean;
}

export interface DbHand {
  id?: string;
  table_id: string;
  hand_number: number;
  variant: string;
  players: unknown;
  community_cards: unknown | null;
  actions: unknown;
  winners: unknown;
  total_pot: string;
  rake_amount?: string;
  shuffle_commitments?: unknown | null;
}

export interface DbHandParticipant {
  id?: string;
  hand_id: string;
  user_id: string;
  seat_number: number;
  starting_stack: string;
  ending_stack: string;
  hole_cards?: unknown | null;
  final_hand_rank?: string | null;
  net_result: string;
  is_winner?: boolean;
  showed_cards?: boolean;
}

export interface DbSession {
  id?: string;
  user_id: string;
  table_id: string;
  seat_number: number;
  buy_in_amount: string;
  cash_out_amount?: string | null;
  hands_played?: number;
  is_active?: boolean;
}

class DatabaseService {
  private client: SupabaseClient | null = null;
  private initialized = false;

  initialize() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || url === "https://your-project.supabase.co") {
      console.warn("⚠️  Supabase not configured - database features disabled");
      console.warn("   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
      return;
    }

    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.initialized = true;
    console.log("✅ Supabase database connected");
  }

  isConnected(): boolean {
    return this.initialized && this.client !== null;
  }

  // ============================================
  // USER OPERATIONS
  // ============================================

  async getOrCreateUser(walletAddress: string): Promise<DbUser | null> {
    if (!this.client) return null;

    const normalizedAddress = walletAddress.toLowerCase();

    // Try to get existing user
    const { data: existingUser, error: fetchError } = await this.client
      .from("users")
      .select("id, wallet_address, username, avatar_url, is_banned")
      .eq("wallet_address", normalizedAddress)
      .single();

    if (existingUser) {
      // Update last_seen_at
      await this.client
        .from("users")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existingUser.id);

      return existingUser;
    }

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching user:", fetchError);
      return null;
    }

    // Create new user
    const { data: newUser, error: createError } = await this.client
      .from("users")
      .insert({
        wallet_address: normalizedAddress,
        username: `Player_${walletAddress.slice(2, 8)}`,
      })
      .select("id, wallet_address, username, avatar_url, is_banned")
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return null;
    }

    return newUser;
  }

  async getUserByWallet(walletAddress: string): Promise<DbUser | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from("users")
      .select("id, wallet_address, username, avatar_url, is_banned")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Error fetching user:", error);
      }
      return null;
    }

    return data;
  }

  // ============================================
  // SESSION OPERATIONS
  // ============================================

  async createSession(session: DbSession): Promise<string | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from("sessions")
      .insert({
        ...session,
        is_active: true,
        hands_played: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return null;
    }

    return data.id;
  }

  async endSession(
    sessionId: string,
    cashOutAmount: string,
    handsPlayed: number
  ): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from("sessions")
      .update({
        cash_out_amount: cashOutAmount,
        hands_played: handsPlayed,
        ended_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Error ending session:", error);
      return false;
    }

    return true;
  }

  async incrementSessionHands(sessionId: string): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client.rpc("increment_session_hands", {
      session_id: sessionId,
    });

    // If the function doesn't exist, do it manually
    if (error) {
      const { data } = await this.client
        .from("sessions")
        .select("hands_played")
        .eq("id", sessionId)
        .single();

      if (data) {
        await this.client
          .from("sessions")
          .update({ hands_played: (data.hands_played || 0) + 1 })
          .eq("id", sessionId);
      }
    }

    return true;
  }

  // ============================================
  // HAND HISTORY OPERATIONS
  // ============================================

  async recordHand(hand: DbHand): Promise<string | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from("hands")
      .insert({
        ...hand,
        ended_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error recording hand:", error);
      return null;
    }

    return data.id;
  }

  async recordHandParticipants(
    participants: DbHandParticipant[]
  ): Promise<boolean> {
    if (!this.client || participants.length === 0) return false;

    const { error } = await this.client
      .from("hand_participants")
      .insert(participants);

    if (error) {
      console.error("Error recording hand participants:", error);
      return false;
    }

    return true;
  }

  // ============================================
  // STATS OPERATIONS
  // ============================================

  async updateUserStats(
    userId: string,
    updates: {
      handsPlayed?: number;
      handsWon?: number;
      handsLost?: number;
      totalWagered?: bigint;
      totalWon?: bigint;
      totalLost?: bigint;
      biggestPotWon?: bigint;
      variant?: "texas-holdem" | "omaha";
    }
  ): Promise<boolean> {
    if (!this.client) return false;

    // Get current stats
    const { data: currentStats, error: fetchError } = await this.client
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching user stats:", fetchError);
      return false;
    }

    // Calculate new values
    const newStats: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.handsPlayed) {
      newStats.hands_played = (currentStats?.hands_played || 0) + updates.handsPlayed;
    }
    if (updates.handsWon) {
      newStats.hands_won = (currentStats?.hands_won || 0) + updates.handsWon;
    }
    if (updates.handsLost) {
      newStats.hands_lost = (currentStats?.hands_lost || 0) + updates.handsLost;
    }
    if (updates.totalWagered) {
      const current = BigInt(currentStats?.total_wagered || "0");
      newStats.total_wagered = (current + updates.totalWagered).toString();
    }
    if (updates.totalWon) {
      const current = BigInt(currentStats?.total_won || "0");
      newStats.total_won = (current + updates.totalWon).toString();
    }
    if (updates.totalLost) {
      const current = BigInt(currentStats?.total_lost || "0");
      newStats.total_lost = (current + updates.totalLost).toString();
    }
    if (updates.biggestPotWon) {
      const current = BigInt(currentStats?.biggest_pot_won || "0");
      if (updates.biggestPotWon > current) {
        newStats.biggest_pot_won = updates.biggestPotWon.toString();
      }
    }
    if (updates.variant === "texas-holdem") {
      newStats.texas_holdem_hands = (currentStats?.texas_holdem_hands || 0) + 1;
    }
    if (updates.variant === "omaha") {
      newStats.omaha_hands = (currentStats?.omaha_hands || 0) + 1;
    }

    const { error: updateError } = await this.client
      .from("user_stats")
      .update(newStats)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating user stats:", updateError);
      return false;
    }

    return true;
  }

  // ============================================
  // TRANSACTION OPERATIONS
  // ============================================

  async recordTransaction(transaction: {
    userId: string;
    type: string;
    amount: string;
    tableId?: string;
    sessionId?: string;
    status?: string;
  }): Promise<string | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from("transactions")
      .insert({
        user_id: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        table_id: transaction.tableId,
        session_id: transaction.sessionId,
        status: transaction.status || "confirmed",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error recording transaction:", error);
      return null;
    }

    return data.id;
  }

  // ============================================
  // CHAT OPERATIONS
  // ============================================

  async saveChatMessage(
    tableId: string,
    userId: string,
    message: string,
    isSystem: boolean = false
  ): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client.from("chat_messages").insert({
      table_id: tableId,
      user_id: userId,
      message,
      is_system: isSystem,
    });

    if (error) {
      console.error("Error saving chat message:", error);
      return false;
    }

    return true;
  }

  async getChatHistory(
    tableId: string,
    limit: number = 100
  ): Promise<Array<{ user_id: string; message: string; created_at: string }>> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from("chat_messages")
      .select("user_id, message, created_at")
      .eq("table_id", tableId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching chat history:", error);
      return [];
    }

    return data || [];
  }
}

// Export singleton instance
export const db = new DatabaseService();
