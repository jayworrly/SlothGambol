-- Fix table_id to use TEXT instead of UUID
-- This allows using string IDs like "table-1" for in-memory tables

-- Drop foreign key constraints first
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_table_id_fkey;
ALTER TABLE hands DROP CONSTRAINT IF EXISTS hands_table_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_table_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_table_id_fkey;

-- Change column types from UUID to TEXT
ALTER TABLE sessions ALTER COLUMN table_id TYPE TEXT;
ALTER TABLE hands ALTER COLUMN table_id TYPE TEXT;
ALTER TABLE chat_messages ALTER COLUMN table_id TYPE TEXT;
ALTER TABLE transactions ALTER COLUMN table_id TYPE TEXT USING table_id::TEXT;

-- Note: We're removing the foreign key constraint because tables may be
-- created dynamically in-memory without database records.
-- The tables table can still be used for persistent/configured tables.
