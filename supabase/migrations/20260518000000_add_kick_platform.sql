-- Add KICK platform to social_monthly_metrics
-- Kick metrics: followers_total, peak_viewers, avg_viewers, live_views, total_stream_time_minutes

-- Drop and recreate the CHECK constraint to include KICK
ALTER TABLE social_monthly_metrics
  DROP CONSTRAINT IF EXISTS social_monthly_metrics_platform_check;

ALTER TABLE social_monthly_metrics
  ADD CONSTRAINT social_monthly_metrics_platform_check
  CHECK (platform IN ('TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X', 'KICK'));
