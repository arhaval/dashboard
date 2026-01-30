-- =============================================================================
-- Add RLS Policy for users to view their own transactions
-- =============================================================================

-- Users can view their own transactions (where user_id matches)
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
