-- =============================================================================
-- Content Goals & Platform Sub-type Support
-- İçerik hedef sistemi — platform ve alt tür bazlı haftalık hedefler
-- =============================================================================

-- 1. Add platform + sub_type to content_plans
ALTER TABLE content_plans
  ADD COLUMN IF NOT EXISTS platform TEXT
    CHECK (platform IN ('YOUTUBE', 'INSTAGRAM', 'X')),
  ADD COLUMN IF NOT EXISTS content_subtype TEXT
    CHECK (content_subtype IN ('VIDEO', 'SHORTS', 'REELS', 'POST'));

-- 2. Weekly content goals table
CREATE TABLE IF NOT EXISTS content_goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     TEXT NOT NULL CHECK (platform IN ('YOUTUBE', 'INSTAGRAM', 'X')),
  sub_type     TEXT NOT NULL CHECK (sub_type IN ('VIDEO', 'SHORTS', 'REELS', 'POST')),
  weekly_target INTEGER NOT NULL DEFAULT 0 CHECK (weekly_target >= 0),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform, sub_type)
);

-- Seed default goals (all start at 0, admin configures)
INSERT INTO content_goals (platform, sub_type, weekly_target) VALUES
  ('YOUTUBE',   'VIDEO',  0),
  ('YOUTUBE',   'SHORTS', 0),
  ('INSTAGRAM', 'REELS',  0),
  ('INSTAGRAM', 'POST',   0),
  ('X',         'POST',   0)
ON CONFLICT (platform, sub_type) DO NOTHING;

-- RLS
ALTER TABLE content_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on content_goals" ON content_goals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "All users can view content_goals" ON content_goals
  FOR SELECT USING (auth.uid() IS NOT NULL);
