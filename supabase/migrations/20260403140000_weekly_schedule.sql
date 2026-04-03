-- =============================================================================
-- Weekly Schedule Table
-- Haftalık içerik programı — gün bazlı aktivite planlaması
-- =============================================================================

CREATE TABLE IF NOT EXISTS weekly_schedule (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  activities   TEXT[]  NOT NULL DEFAULT '{}',
  notes        TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (day_of_week)
);

-- Seed 7 days (1=Pazartesi ... 7=Pazar)
INSERT INTO weekly_schedule (day_of_week, activities) VALUES
  (1, '{}'),
  (2, '{}'),
  (3, '{}'),
  (4, '{}'),
  (5, '{}'),
  (6, '{}'),
  (7, '{}')
ON CONFLICT (day_of_week) DO NOTHING;

-- RLS
ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on weekly_schedule" ON weekly_schedule
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "All users can view weekly_schedule" ON weekly_schedule
  FOR SELECT USING (auth.uid() IS NOT NULL);
