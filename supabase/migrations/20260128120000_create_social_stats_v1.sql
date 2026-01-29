-- Social Stats v1 Table
-- Simple table for tracking social media statistics

CREATE TABLE social_stats_v1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('twitch', 'youtube', 'instagram', 'x')),
  followers INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_social_stats_v1_date ON social_stats_v1(date DESC);
CREATE INDEX idx_social_stats_v1_platform ON social_stats_v1(platform);

-- RLS
ALTER TABLE social_stats_v1 ENABLE ROW LEVEL SECURITY;

-- Only admins can access social stats
CREATE POLICY "Admins full access to social_stats_v1" ON social_stats_v1
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
