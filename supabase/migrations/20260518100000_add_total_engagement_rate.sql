-- Add channel-level monthly engagement rate to social_monthly_metrics
-- Calculated on save:
--   X         : (likes + replies + shares[=retweets]) / impressions * 100
--   Instagram : (likes + comments + saves) / views * 100
--   YouTube   : (total_likes + total_comments) / video_views * 100
--   Twitch/Kick: 0 (no standard engagement rate formula)

ALTER TABLE social_monthly_metrics
  ADD COLUMN IF NOT EXISTS total_engagement_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0;
