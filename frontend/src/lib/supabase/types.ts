// Generated types for Supabase database schema
// Matches: supabase/migrations/001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PokerVariant = "texas-holdem" | "omaha" | "omaha-hi-lo";
export type GamePhase = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
export type TransactionType = "deposit" | "withdrawal" | "buy_in" | "cash_out" | "tournament_entry" | "tournament_prize" | "rebuy" | "addon" | "rake";
export type TransactionStatus = "pending" | "confirmed" | "failed";
export type TournamentStatus = "scheduled" | "registering" | "running" | "paused" | "finished" | "cancelled";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          last_seen_at: string;
          is_banned: boolean;
          ban_reason: string | null;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
          is_banned?: boolean;
          ban_reason?: string | null;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
          is_banned?: boolean;
          ban_reason?: string | null;
        };
      };
      user_stats: {
        Row: {
          id: string;
          user_id: string;
          hands_played: number;
          hands_won: number;
          hands_lost: number;
          total_wagered: string; // bigint stored as string
          total_won: string;
          total_lost: string;
          biggest_pot_won: string;
          texas_holdem_hands: number;
          omaha_hands: number;
          tournaments_played: number;
          tournaments_won: number;
          tournament_cashes: number;
          tournament_earnings: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hands_played?: number;
          hands_won?: number;
          hands_lost?: number;
          total_wagered?: string;
          total_won?: string;
          total_lost?: string;
          biggest_pot_won?: string;
          texas_holdem_hands?: number;
          omaha_hands?: number;
          tournaments_played?: number;
          tournaments_won?: number;
          tournament_cashes?: number;
          tournament_earnings?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hands_played?: number;
          hands_won?: number;
          hands_lost?: number;
          total_wagered?: string;
          total_won?: string;
          total_lost?: string;
          biggest_pot_won?: string;
          texas_holdem_hands?: number;
          omaha_hands?: number;
          tournaments_played?: number;
          tournaments_won?: number;
          tournament_cashes?: number;
          tournament_earnings?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          contract_address: string | null;
          name: string;
          variant: PokerVariant;
          small_blind: string;
          big_blind: string;
          min_buy_in: string;
          max_buy_in: string;
          max_players: 2 | 6 | 9;
          time_bank: number;
          is_private: boolean;
          password_hash: string | null;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          contract_address?: string | null;
          name: string;
          variant: PokerVariant;
          small_blind: string;
          big_blind: string;
          min_buy_in: string;
          max_buy_in: string;
          max_players: 2 | 6 | 9;
          time_bank?: number;
          is_private?: boolean;
          password_hash?: string | null;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          contract_address?: string | null;
          name?: string;
          variant?: PokerVariant;
          small_blind?: string;
          big_blind?: string;
          min_buy_in?: string;
          max_buy_in?: string;
          max_players?: 2 | 6 | 9;
          time_bank?: number;
          is_private?: boolean;
          password_hash?: string | null;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          table_id: string;
          seat_number: number;
          buy_in_amount: string;
          cash_out_amount: string | null;
          started_at: string;
          ended_at: string | null;
          hands_played: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          table_id: string;
          seat_number: number;
          buy_in_amount: string;
          cash_out_amount?: string | null;
          started_at?: string;
          ended_at?: string | null;
          hands_played?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          table_id?: string;
          seat_number?: number;
          buy_in_amount?: string;
          cash_out_amount?: string | null;
          started_at?: string;
          ended_at?: string | null;
          hands_played?: number;
          is_active?: boolean;
        };
      };
      hands: {
        Row: {
          id: string;
          table_id: string;
          hand_number: number;
          variant: string;
          players: Json;
          community_cards: Json | null;
          actions: Json;
          winners: Json;
          total_pot: string;
          rake_amount: string;
          started_at: string;
          ended_at: string | null;
          shuffle_commitments: Json | null;
          is_verified: boolean;
        };
        Insert: {
          id?: string;
          table_id: string;
          hand_number: number;
          variant: string;
          players: Json;
          community_cards?: Json | null;
          actions: Json;
          winners: Json;
          total_pot: string;
          rake_amount?: string;
          started_at?: string;
          ended_at?: string | null;
          shuffle_commitments?: Json | null;
          is_verified?: boolean;
        };
        Update: {
          id?: string;
          table_id?: string;
          hand_number?: number;
          variant?: string;
          players?: Json;
          community_cards?: Json | null;
          actions?: Json;
          winners?: Json;
          total_pot?: string;
          rake_amount?: string;
          started_at?: string;
          ended_at?: string | null;
          shuffle_commitments?: Json | null;
          is_verified?: boolean;
        };
      };
      hand_participants: {
        Row: {
          id: string;
          hand_id: string;
          user_id: string;
          seat_number: number;
          starting_stack: string;
          ending_stack: string;
          hole_cards: Json | null;
          final_hand_rank: string | null;
          net_result: string;
          is_winner: boolean;
          showed_cards: boolean;
        };
        Insert: {
          id?: string;
          hand_id: string;
          user_id: string;
          seat_number: number;
          starting_stack: string;
          ending_stack: string;
          hole_cards?: Json | null;
          final_hand_rank?: string | null;
          net_result: string;
          is_winner?: boolean;
          showed_cards?: boolean;
        };
        Update: {
          id?: string;
          hand_id?: string;
          user_id?: string;
          seat_number?: number;
          starting_stack?: string;
          ending_stack?: string;
          hole_cards?: Json | null;
          final_hand_rank?: string | null;
          net_result?: string;
          is_winner?: boolean;
          showed_cards?: boolean;
        };
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          variant: PokerVariant;
          buy_in: string;
          entry_fee: string;
          starting_chips: string;
          max_players: number;
          min_players: number;
          blind_structure: Json;
          status: TournamentStatus;
          prize_pool: string;
          payout_structure: Json | null;
          scheduled_start: string | null;
          registration_open: string | null;
          registration_close: string | null;
          started_at: string | null;
          finished_at: string | null;
          late_registration_levels: number;
          rebuy_allowed: boolean;
          rebuy_end_level: number | null;
          addon_allowed: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          variant: PokerVariant;
          buy_in: string;
          entry_fee?: string;
          starting_chips: string;
          max_players: number;
          min_players?: number;
          blind_structure: Json;
          status?: TournamentStatus;
          prize_pool?: string;
          payout_structure?: Json | null;
          scheduled_start?: string | null;
          registration_open?: string | null;
          registration_close?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          late_registration_levels?: number;
          rebuy_allowed?: boolean;
          rebuy_end_level?: number | null;
          addon_allowed?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          variant?: PokerVariant;
          buy_in?: string;
          entry_fee?: string;
          starting_chips?: string;
          max_players?: number;
          min_players?: number;
          blind_structure?: Json;
          status?: TournamentStatus;
          prize_pool?: string;
          payout_structure?: Json | null;
          scheduled_start?: string | null;
          registration_open?: string | null;
          registration_close?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          late_registration_levels?: number;
          rebuy_allowed?: boolean;
          rebuy_end_level?: number | null;
          addon_allowed?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
      };
      tournament_registrations: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          registered_at: string;
          buy_in_tx_hash: string | null;
          finish_position: number | null;
          prize_amount: string;
          chips_finish: string | null;
          is_eliminated: boolean;
          eliminated_at: string | null;
          eliminated_hand_id: string | null;
          rebuy_count: number;
          addon_taken: boolean;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          registered_at?: string;
          buy_in_tx_hash?: string | null;
          finish_position?: number | null;
          prize_amount?: string;
          chips_finish?: string | null;
          is_eliminated?: boolean;
          eliminated_at?: string | null;
          eliminated_hand_id?: string | null;
          rebuy_count?: number;
          addon_taken?: boolean;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          registered_at?: string;
          buy_in_tx_hash?: string | null;
          finish_position?: number | null;
          prize_amount?: string;
          chips_finish?: string | null;
          is_eliminated?: boolean;
          eliminated_at?: string | null;
          eliminated_hand_id?: string | null;
          rebuy_count?: number;
          addon_taken?: boolean;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: string;
          tx_hash: string | null;
          block_number: string | null;
          contract_address: string | null;
          table_id: string | null;
          tournament_id: string | null;
          session_id: string | null;
          status: TransactionStatus;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: TransactionType;
          amount: string;
          tx_hash?: string | null;
          block_number?: string | null;
          contract_address?: string | null;
          table_id?: string | null;
          tournament_id?: string | null;
          session_id?: string | null;
          status?: TransactionStatus;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: string;
          tx_hash?: string | null;
          block_number?: string | null;
          contract_address?: string | null;
          table_id?: string | null;
          tournament_id?: string | null;
          session_id?: string | null;
          status?: TransactionStatus;
          created_at?: string;
          confirmed_at?: string | null;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          table_id: string;
          user_id: string;
          message: string;
          created_at: string;
          is_system: boolean;
        };
        Insert: {
          id?: string;
          table_id: string;
          user_id: string;
          message: string;
          created_at?: string;
          is_system?: boolean;
        };
        Update: {
          id?: string;
          table_id?: string;
          user_id?: string;
          message?: string;
          created_at?: string;
          is_system?: boolean;
        };
      };
    };
    Functions: {
      get_leaderboard: {
        Args: {
          limit_count?: number;
          stat_type?: string;
        };
        Returns: {
          rank: number;
          user_id: string;
          username: string | null;
          wallet_address: string;
          stat_value: string;
        }[];
      };
    };
  };
}

// Helper types for easier use
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export type UserStats = Database["public"]["Tables"]["user_stats"]["Row"];
export type UserStatsInsert = Database["public"]["Tables"]["user_stats"]["Insert"];
export type UserStatsUpdate = Database["public"]["Tables"]["user_stats"]["Update"];

export type Table = Database["public"]["Tables"]["tables"]["Row"];
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];
export type TableUpdate = Database["public"]["Tables"]["tables"]["Update"];

export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
export type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

export type Hand = Database["public"]["Tables"]["hands"]["Row"];
export type HandInsert = Database["public"]["Tables"]["hands"]["Insert"];
export type HandUpdate = Database["public"]["Tables"]["hands"]["Update"];

export type HandParticipant = Database["public"]["Tables"]["hand_participants"]["Row"];
export type HandParticipantInsert = Database["public"]["Tables"]["hand_participants"]["Insert"];
export type HandParticipantUpdate = Database["public"]["Tables"]["hand_participants"]["Update"];

export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentInsert = Database["public"]["Tables"]["tournaments"]["Insert"];
export type TournamentUpdate = Database["public"]["Tables"]["tournaments"]["Update"];

export type TournamentRegistration = Database["public"]["Tables"]["tournament_registrations"]["Row"];
export type TournamentRegistrationInsert = Database["public"]["Tables"]["tournament_registrations"]["Insert"];
export type TournamentRegistrationUpdate = Database["public"]["Tables"]["tournament_registrations"]["Update"];

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type ChatMessageInsert = Database["public"]["Tables"]["chat_messages"]["Insert"];
export type ChatMessageUpdate = Database["public"]["Tables"]["chat_messages"]["Update"];

// Leaderboard result type
export type LeaderboardEntry = Database["public"]["Functions"]["get_leaderboard"]["Returns"][number];

// Card and hand types for game logic
export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
}

export interface HandResult {
  rank: string;
  description: string;
  cards: Card[];
}

export interface PlayerAction {
  type: "fold" | "check" | "call" | "bet" | "raise" | "all-in";
  amount: string;
  timestamp: number;
}

export interface BlindLevel {
  level: number;
  small_blind: string;
  big_blind: string;
  ante: string;
  duration: number; // minutes
}

export interface PayoutEntry {
  place: number;
  percentage: number;
}
