// Main exports for Supabase integration
export { supabase } from "./client";
export type { SupabaseClient } from "./client";

// Type exports
export * from "./types";

// Hook exports (client-side only)
export {
  useUser,
  useUserStats,
  useLeaderboard,
  useHandHistory,
  useTransactions,
  useRealtimeUser,
  useRealtimeUserStats,
} from "./hooks";
