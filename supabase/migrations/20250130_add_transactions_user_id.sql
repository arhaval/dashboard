-- Add user_id column to transactions table
-- This allows tracking which team member a transaction is related to
-- Run this migration in Supabase SQL Editor

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Add comment for documentation
COMMENT ON COLUMN transactions.user_id IS 'Related team member (for team expenses/payments)';
