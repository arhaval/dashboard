-- =============================================================================
-- Fix RLS Recursion Issue
-- The admin policies were checking the users table which caused infinite recursion
-- Solution: Use a security definer function to check admin status
-- =============================================================================

-- Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Drop existing problematic policies on other tables that reference users
DROP POLICY IF EXISTS "Users can view own work items" ON work_items;
DROP POLICY IF EXISTS "Admins can view all work items" ON work_items;
DROP POLICY IF EXISTS "Users can create own work items" ON work_items;
DROP POLICY IF EXISTS "Users can update own draft work items" ON work_items;
DROP POLICY IF EXISTS "Admins can update all work items" ON work_items;
DROP POLICY IF EXISTS "Users can delete own draft work items" ON work_items;
DROP POLICY IF EXISTS "Admins can delete any work item" ON work_items;

DROP POLICY IF EXISTS "Admins can view payments" ON payments;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Admins can create payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;

DROP POLICY IF EXISTS "Admins can manage payment items" ON payment_items;
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions;

DROP POLICY IF EXISTS "Everyone can view social stats" ON social_stats;
DROP POLICY IF EXISTS "Admins can manage social stats" ON social_stats;
DROP POLICY IF EXISTS "Admins can update social stats" ON social_stats;
DROP POLICY IF EXISTS "Admins can delete social stats" ON social_stats;

DROP POLICY IF EXISTS "Users can view own advances" ON advances;
DROP POLICY IF EXISTS "Admins can view all advances" ON advances;
DROP POLICY IF EXISTS "Admins can create advances" ON advances;
DROP POLICY IF EXISTS "Admins can update advances" ON advances;

-- =============================================================================
-- Create a security definer function to check if user is admin
-- This bypasses RLS and prevents recursion
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  RETURN user_role = 'ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- =============================================================================
-- USERS TABLE POLICIES (Fixed)
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all users (using function to avoid recursion)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (public.is_admin());

-- Admins can insert users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (public.is_admin());

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (public.is_admin());

-- Users can update their own profile (limited fields handled at app level)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- WORK ITEMS TABLE POLICIES (Fixed)
-- =============================================================================

-- Users can view their own work items
CREATE POLICY "Users can view own work items" ON work_items
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all work items
CREATE POLICY "Admins can view all work items" ON work_items
  FOR SELECT USING (public.is_admin());

-- Users can create their own work items
CREATE POLICY "Users can create own work items" ON work_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own work items (only DRAFT status)
CREATE POLICY "Users can update own draft work items" ON work_items
  FOR UPDATE USING (auth.uid() = user_id AND status = 'DRAFT');

-- Admins can update all work items
CREATE POLICY "Admins can update all work items" ON work_items
  FOR UPDATE USING (public.is_admin());

-- Users can delete their own draft work items
CREATE POLICY "Users can delete own draft work items" ON work_items
  FOR DELETE USING (auth.uid() = user_id AND status = 'DRAFT');

-- Admins can delete any work item
CREATE POLICY "Admins can delete any work item" ON work_items
  FOR DELETE USING (public.is_admin());

-- =============================================================================
-- PAYMENTS TABLE POLICIES (Fixed)
-- =============================================================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (public.is_admin());

-- Only admins can create payments
CREATE POLICY "Admins can create payments" ON payments
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update payments
CREATE POLICY "Admins can update payments" ON payments
  FOR UPDATE USING (public.is_admin());

-- =============================================================================
-- PAYMENT ITEMS TABLE POLICIES (Fixed)
-- =============================================================================

CREATE POLICY "Admins can manage payment items" ON payment_items
  FOR ALL USING (public.is_admin());

-- =============================================================================
-- TRANSACTIONS TABLE POLICIES (Fixed)
-- =============================================================================

CREATE POLICY "Admins can manage transactions" ON transactions
  FOR ALL USING (public.is_admin());

-- =============================================================================
-- SOCIAL STATS TABLE POLICIES (Fixed)
-- =============================================================================

-- Everyone can view social stats (no change needed)
CREATE POLICY "Everyone can view social stats" ON social_stats
  FOR SELECT USING (true);

-- Only admins can manage social stats
CREATE POLICY "Admins can insert social stats" ON social_stats
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update social stats" ON social_stats
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete social stats" ON social_stats
  FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ADVANCES TABLE POLICIES (Fixed)
-- =============================================================================

-- Users can view their own advances
CREATE POLICY "Users can view own advances" ON advances
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all advances
CREATE POLICY "Admins can view all advances" ON advances
  FOR SELECT USING (public.is_admin());

-- Only admins can create advances
CREATE POLICY "Admins can create advances" ON advances
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update advances
CREATE POLICY "Admins can update advances" ON advances
  FOR UPDATE USING (public.is_admin());
