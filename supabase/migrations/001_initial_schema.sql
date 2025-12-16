-- Avalanche Poker dApp Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Links wallet addresses to user profiles
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT
);

-- Index for wallet lookup
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- ============================================
-- USER STATS TABLE
-- Tracks player statistics
-- ============================================
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- Game stats
  hands_played INTEGER DEFAULT 0,
  hands_won INTEGER DEFAULT 0,
  hands_lost INTEGER DEFAULT 0,
  -- Financial stats
  total_wagered BIGINT DEFAULT 0,
  total_won BIGINT DEFAULT 0,
  total_lost BIGINT DEFAULT 0,
  biggest_pot_won BIGINT DEFAULT 0,
  -- Variant-specific stats
  texas_holdem_hands INTEGER DEFAULT 0,
  omaha_hands INTEGER DEFAULT 0,
  -- Tournament stats
  tournaments_played INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  tournament_cashes INTEGER DEFAULT 0,
  tournament_earnings BIGINT DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- TABLES TABLE
-- Defines poker table configurations
-- ============================================
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_address TEXT,
  name TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('texas-holdem', 'omaha', 'omaha-hi-lo')),
  small_blind BIGINT NOT NULL,
  big_blind BIGINT NOT NULL,
  min_buy_in BIGINT NOT NULL,
  max_buy_in BIGINT NOT NULL,
  max_players INTEGER NOT NULL CHECK (max_players IN (2, 6, 9)),
  time_bank INTEGER DEFAULT 30,
  is_private BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index for active tables
CREATE INDEX idx_tables_active ON tables(is_active) WHERE is_active = TRUE;

-- ============================================
-- SESSIONS TABLE
-- Tracks player sessions at tables
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  buy_in_amount BIGINT NOT NULL,
  cash_out_amount BIGINT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  hands_played INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for active sessions
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ============================================
-- HANDS TABLE
-- Records completed poker hands
-- ============================================
CREATE TABLE hands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  hand_number INTEGER NOT NULL,
  variant TEXT NOT NULL,
  -- Game data (stored as JSON for flexibility)
  players JSONB NOT NULL, -- Array of player info at hand start
  community_cards JSONB, -- Array of community cards
  actions JSONB NOT NULL, -- Array of all actions taken
  winners JSONB NOT NULL, -- Array of winners and amounts
  -- Pot info
  total_pot BIGINT NOT NULL,
  rake_amount BIGINT DEFAULT 0,
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  -- Mental poker verification
  shuffle_commitments JSONB,
  is_verified BOOLEAN DEFAULT FALSE
);

-- Index for hand history queries
CREATE INDEX idx_hands_table ON hands(table_id);
CREATE INDEX idx_hands_timestamp ON hands(started_at DESC);

-- ============================================
-- HAND PARTICIPANTS TABLE
-- Links users to hands they played
-- ============================================
CREATE TABLE hand_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID REFERENCES hands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  starting_stack BIGINT NOT NULL,
  ending_stack BIGINT NOT NULL,
  hole_cards JSONB, -- Encrypted or revealed cards
  final_hand_rank TEXT, -- e.g., "full-house", "pair"
  net_result BIGINT NOT NULL, -- Positive = won, negative = lost
  is_winner BOOLEAN DEFAULT FALSE,
  showed_cards BOOLEAN DEFAULT FALSE
);

-- Index for user hand history
CREATE INDEX idx_hand_participants_user ON hand_participants(user_id);
CREATE INDEX idx_hand_participants_hand ON hand_participants(hand_id);

-- ============================================
-- TOURNAMENTS TABLE
-- Tournament definitions
-- ============================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  variant TEXT NOT NULL CHECK (variant IN ('texas-holdem', 'omaha', 'omaha-hi-lo')),
  -- Entry
  buy_in BIGINT NOT NULL,
  entry_fee BIGINT DEFAULT 0,
  starting_chips BIGINT NOT NULL,
  -- Structure
  max_players INTEGER NOT NULL,
  min_players INTEGER DEFAULT 2,
  blind_structure JSONB NOT NULL, -- Array of {level, small_blind, big_blind, ante, duration}
  -- Status
  status TEXT DEFAULT 'registering' CHECK (status IN ('scheduled', 'registering', 'running', 'paused', 'finished', 'cancelled')),
  -- Prize
  prize_pool BIGINT DEFAULT 0,
  payout_structure JSONB, -- Array of {place, percentage}
  -- Timing
  scheduled_start TIMESTAMPTZ,
  registration_open TIMESTAMPTZ,
  registration_close TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  -- Settings
  late_registration_levels INTEGER DEFAULT 0,
  rebuy_allowed BOOLEAN DEFAULT FALSE,
  rebuy_end_level INTEGER,
  addon_allowed BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index for active tournaments
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_scheduled ON tournaments(scheduled_start);

-- ============================================
-- TOURNAMENT REGISTRATIONS TABLE
-- Players registered for tournaments
-- ============================================
CREATE TABLE tournament_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  buy_in_tx_hash TEXT,
  -- Results
  finish_position INTEGER,
  prize_amount BIGINT DEFAULT 0,
  chips_finish BIGINT,
  -- Status
  is_eliminated BOOLEAN DEFAULT FALSE,
  eliminated_at TIMESTAMPTZ,
  eliminated_hand_id UUID REFERENCES hands(id),
  -- Rebuys/Addons
  rebuy_count INTEGER DEFAULT 0,
  addon_taken BOOLEAN DEFAULT FALSE,
  UNIQUE(tournament_id, user_id)
);

-- Index for tournament players
CREATE INDEX idx_tournament_regs_tournament ON tournament_registrations(tournament_id);
CREATE INDEX idx_tournament_regs_user ON tournament_registrations(user_id);

-- ============================================
-- TRANSACTIONS TABLE
-- Financial transaction log
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'buy_in', 'cash_out', 'tournament_entry', 'tournament_prize', 'rebuy', 'addon', 'rake')),
  amount BIGINT NOT NULL,
  -- Blockchain data
  tx_hash TEXT,
  block_number BIGINT,
  contract_address TEXT,
  -- Reference
  table_id UUID REFERENCES tables(id),
  tournament_id UUID REFERENCES tournaments(id),
  session_id UUID REFERENCES sessions(id),
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Index for user transactions
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);

-- ============================================
-- CHAT MESSAGES TABLE
-- Table chat history
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_system BOOLEAN DEFAULT FALSE
);

-- Index for chat queries
CREATE INDEX idx_chat_table ON chat_messages(table_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read all users (public profiles)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = wallet_address);

-- Stats are viewable by everyone
CREATE POLICY "Stats are viewable by everyone" ON user_stats
  FOR SELECT USING (true);

-- Tables are viewable by everyone
CREATE POLICY "Tables are viewable by everyone" ON tables
  FOR SELECT USING (true);

-- Sessions are viewable by the user
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text));

-- Hands are viewable by participants
CREATE POLICY "Hand participants can view hands" ON hands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hand_participants hp
      JOIN users u ON hp.user_id = u.id
      WHERE hp.hand_id = hands.id AND u.wallet_address = auth.uid()::text
    )
  );

-- Hand participants can view their own participation
CREATE POLICY "Users can view own hand participation" ON hand_participants
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text));

-- Tournaments are viewable by everyone
CREATE POLICY "Tournaments are viewable by everyone" ON tournaments
  FOR SELECT USING (true);

-- Tournament registrations are viewable by the user
CREATE POLICY "Users can view own tournament registrations" ON tournament_registrations
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text));

-- Transactions are viewable by the user
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text));

-- Chat messages are viewable by everyone at the table
CREATE POLICY "Chat messages are viewable by everyone" ON chat_messages
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user stats when user is created
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_user_stats_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats();

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(
  limit_count INTEGER DEFAULT 100,
  stat_type TEXT DEFAULT 'total_won'
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  wallet_address TEXT,
  stat_value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY
      CASE stat_type
        WHEN 'total_won' THEN us.total_won
        WHEN 'hands_won' THEN us.hands_won::BIGINT
        WHEN 'tournaments_won' THEN us.tournaments_won::BIGINT
        ELSE us.total_won
      END DESC
    ) as rank,
    u.id as user_id,
    u.username,
    u.wallet_address,
    CASE stat_type
      WHEN 'total_won' THEN us.total_won
      WHEN 'hands_won' THEN us.hands_won::BIGINT
      WHEN 'tournaments_won' THEN us.tournaments_won::BIGINT
      ELSE us.total_won
    END as stat_value
  FROM users u
  JOIN user_stats us ON u.id = us.user_id
  WHERE u.is_banned = FALSE
  ORDER BY stat_value DESC
  LIMIT limit_count;
END;
$$ language 'plpgsql';
