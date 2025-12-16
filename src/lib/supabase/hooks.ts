"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "./client";
import type {
  User,
  UserStats,
  Hand,
  HandParticipant,
  LeaderboardEntry,
  Transaction,
} from "./types";

// ============================================
// USER HOOKS
// ============================================

export function useUser() {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrCreateUser = useCallback(async () => {
    if (!address || !isConnected) {
      setUser(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to fetch existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", address.toLowerCase())
        .single();

      if (existingUser) {
        // Update last_seen_at
        await supabase
          .from("users")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", existingUser.id);

        setUser(existingUser as User);
        return;
      }

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      // Create new user
      const { data: createdUser, error: createError } = await supabase
        .from("users")
        .insert({
          wallet_address: address.toLowerCase(),
          username: `Player_${address.slice(2, 8)}`,
        })
        .select()
        .single();

      if (createError) throw createError;
      setUser(createdUser as User);
    } catch (err) {
      console.error("Error fetching/creating user:", err);
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchOrCreateUser();
  }, [fetchOrCreateUser]);

  const updateUsername = useCallback(
    async (username: string) => {
      if (!user) return { success: false, error: "No user logged in" };

      const { error } = await supabase
        .from("users")
        .update({ username })
        .eq("id", user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      setUser((prev) => (prev ? { ...prev, username } : null));
      return { success: true };
    },
    [user]
  );

  const updateAvatar = useCallback(
    async (avatarUrl: string) => {
      if (!user) return { success: false, error: "No user logged in" };

      const { error } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      setUser((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
      return { success: true };
    },
    [user]
  );

  return {
    user,
    loading,
    error,
    refetch: fetchOrCreateUser,
    updateUsername,
    updateAvatar,
  };
}

// ============================================
// USER STATS HOOKS
// ============================================

export function useUserStats(userId?: string) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError) throw fetchError;
      setStats(data as UserStats);
    } catch (err) {
      console.error("Error fetching user stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// ============================================
// LEADERBOARD HOOKS
// ============================================

export function useLeaderboard(
  statType: "total_won" | "hands_won" | "tournaments_won" = "total_won",
  limit: number = 100
) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc("get_leaderboard", {
        limit_count: limit,
        stat_type: statType,
      });

      if (fetchError) throw fetchError;
      setLeaderboard((data as LeaderboardEntry[]) || []);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [statType, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, loading, error, refetch: fetchLeaderboard };
}

// ============================================
// HAND HISTORY HOOKS
// ============================================

interface HandWithParticipation extends HandParticipant {
  hand: Hand | null;
}

export function useHandHistory(userId?: string, limit: number = 50) {
  const [hands, setHands] = useState<HandWithParticipation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHandHistory = useCallback(async () => {
    if (!userId) {
      setHands([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("hand_participants")
        .select(`
          *,
          hand:hands(*)
        `)
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setHands((data as HandWithParticipation[]) || []);
    } catch (err) {
      console.error("Error fetching hand history:", err);
      setError(err instanceof Error ? err.message : "Failed to load hand history");
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchHandHistory();
  }, [fetchHandHistory]);

  return { hands, loading, error, refetch: fetchHandHistory };
}

// ============================================
// TRANSACTION HOOKS
// ============================================

export function useTransactions(userId?: string, limit: number = 50) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setTransactions((data as Transaction[]) || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function useRealtimeUser(userId?: string) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => setUser(data as User | null));

    // Subscribe to changes
    const channel = supabase
      .channel(`user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setUser(payload.new as User);
          } else if (payload.eventType === "DELETE") {
            setUser(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return user;
}

export function useRealtimeUserStats(userId?: string) {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => setStats(data as UserStats | null));

    // Subscribe to changes
    const channel = supabase
      .channel(`user_stats:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_stats",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setStats(payload.new as UserStats);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return stats;
}
