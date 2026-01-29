-- Social Monthly Metrics Table
-- Unified table for all platform metrics with monthly granularity

CREATE TABLE social_monthly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  platform TEXT NOT NULL CHECK (platform IN ('TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X')),

  -- Common field
  followers_total INTEGER NOT NULL DEFAULT 0,

  -- Twitch-specific
  total_stream_time_minutes INTEGER,
  avg_viewers INTEGER,
  peak_viewers INTEGER,
  unique_viewers INTEGER,
  live_views INTEGER,
  unique_chatters INTEGER,
  subs_total INTEGER,

  -- YouTube-specific
  video_views INTEGER,
  shorts_views INTEGER,
  -- live_views shared with Twitch
  total_likes INTEGER,
  total_comments INTEGER,
  avg_live_viewers INTEGER,
  peak_live_viewers INTEGER,
  subscribers_total INTEGER,

  -- Instagram-specific
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  saves INTEGER,
  shares INTEGER,

  -- X (Twitter)-specific
  impressions INTEGER,
  engagement_rate DECIMAL(5,2), -- e.g., 3.45%
  -- likes shared with Instagram
  replies INTEGER,
  profile_visits INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per month per platform
  UNIQUE(month, platform)
);

-- Indexes
CREATE INDEX idx_social_monthly_metrics_month ON social_monthly_metrics(month DESC);
CREATE INDEX idx_social_monthly_metrics_platform ON social_monthly_metrics(platform);
CREATE INDEX idx_social_monthly_metrics_month_platform ON social_monthly_metrics(month, platform);

-- RLS
ALTER TABLE social_monthly_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can manage social metrics
CREATE POLICY "Admins full access to social_monthly_metrics" ON social_monthly_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
