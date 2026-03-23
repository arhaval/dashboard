-- Social Monthly Notes
-- One note per month for social media evaluation context
CREATE TABLE social_monthly_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL UNIQUE, -- YYYY-MM
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_monthly_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to social_monthly_notes" ON social_monthly_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Social Goals
-- Monthly targets per platform per metric
CREATE TABLE social_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X')),
  metric_key TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, platform, metric_key)
);

CREATE INDEX idx_social_goals_month ON social_goals(month);

ALTER TABLE social_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to social_goals" ON social_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
