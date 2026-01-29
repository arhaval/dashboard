-- =============================================================================
-- Arhaval Dashboard - Initial Database Schema
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'PUBLISHER', 'EDITOR', 'VOICE');
CREATE TYPE work_type AS ENUM ('STREAM', 'VOICE', 'EDIT');
CREATE TYPE work_status AS ENUM ('DRAFT', 'APPROVED', 'PAID');
CREATE TYPE content_length AS ENUM ('SHORT', 'LONG');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

-- =============================================================================
-- USERS TABLE
-- Managed by admin, no self-registration
-- =============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'VOICE',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WORK ITEMS TABLE
-- All work tracked here (STREAM, VOICE, EDIT)
-- =============================================================================

CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  work_type work_type NOT NULL,
  status work_status DEFAULT 'DRAFT',

  -- Common fields
  work_date DATE NOT NULL,
  cost DECIMAL(10,2),
  notes TEXT,

  -- STREAM specific
  match_name TEXT,
  duration_minutes INTEGER,

  -- VOICE/EDIT specific
  content_name TEXT,
  content_length content_length,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PAYMENTS TABLE
-- Created when work items are marked as paid
-- =============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PAYMENT ITEMS TABLE
-- Links payments to work items (many-to-many)
-- =============================================================================

CREATE TABLE payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(payment_id, work_item_id)
);

-- =============================================================================
-- TRANSACTIONS TABLE
-- Financial ledger (income/expense)
-- =============================================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,

  -- Optional link to payment (for team expenses)
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SOCIAL STATS TABLE
-- Period-based social media statistics
-- =============================================================================

CREATE TABLE social_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- 'twitch', 'youtube', 'instagram', 'x'
  period_type TEXT NOT NULL, -- 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metrics (flexible JSON for platform differences)
  metrics JSONB NOT NULL DEFAULT '{}',

  is_manual BOOLEAN DEFAULT false, -- true for Instagram/X
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform, period_type, period_start)
);

-- =============================================================================
-- ADVANCES TABLE
-- Team advances (money given in advance)
-- =============================================================================

CREATE TABLE advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  advance_date DATE NOT NULL,
  notes TEXT,
  is_settled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_work_items_user ON work_items(user_id);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_date ON work_items(work_date);
CREATE INDEX idx_work_items_type ON work_items(work_type);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_social_stats_platform ON social_stats(platform, period_start);
CREATE INDEX idx_advances_user ON advances(user_id);
CREATE INDEX idx_advances_settled ON advances(is_settled);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - USERS TABLE
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can insert users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update users
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can update their own profile (limited fields handled at app level)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- RLS POLICIES - WORK ITEMS TABLE
-- =============================================================================

-- Users can view their own work items
CREATE POLICY "Users can view own work items" ON work_items
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all work items
CREATE POLICY "Admins can view all work items" ON work_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can create their own work items
CREATE POLICY "Users can create own work items" ON work_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own work items (only DRAFT status)
CREATE POLICY "Users can update own draft work items" ON work_items
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'DRAFT'
  );

-- Admins can update all work items
CREATE POLICY "Admins can update all work items" ON work_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can delete their own draft work items
CREATE POLICY "Users can delete own draft work items" ON work_items
  FOR DELETE USING (
    auth.uid() = user_id AND status = 'DRAFT'
  );

-- Admins can delete any work item
CREATE POLICY "Admins can delete any work item" ON work_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- RLS POLICIES - PAYMENTS TABLE (Admin only)
-- =============================================================================

-- Only admins can view payments
CREATE POLICY "Admins can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins can create payments
CREATE POLICY "Admins can create payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Only admins can update payments
CREATE POLICY "Admins can update payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- RLS POLICIES - PAYMENT ITEMS TABLE (Admin only)
-- =============================================================================

CREATE POLICY "Admins can manage payment items" ON payment_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- RLS POLICIES - TRANSACTIONS TABLE (Admin only)
-- =============================================================================

CREATE POLICY "Admins can manage transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- RLS POLICIES - SOCIAL STATS TABLE
-- =============================================================================

-- Everyone can view social stats
CREATE POLICY "Everyone can view social stats" ON social_stats
  FOR SELECT USING (true);

-- Only admins can manage social stats
CREATE POLICY "Admins can manage social stats" ON social_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update social stats" ON social_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete social stats" ON social_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- RLS POLICIES - ADVANCES TABLE (Admin only)
-- =============================================================================

-- Users can view their own advances
CREATE POLICY "Users can view own advances" ON advances
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all advances
CREATE POLICY "Admins can view all advances" ON advances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Only admins can create advances
CREATE POLICY "Admins can create advances" ON advances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Only admins can update advances
CREATE POLICY "Admins can update advances" ON advances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
