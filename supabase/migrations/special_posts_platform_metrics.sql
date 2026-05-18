-- Platform bazlı ek metrikler için JSONB sütunu
-- Örnek: YouTube → watch_time_minutes, subscribers_gained, ctr_percent
--        X       → impressions, retweets, replies, link_clicks
--        Twitch  → peak_viewers, avg_viewers, hours_watched

ALTER TABLE special_posts
  ADD COLUMN IF NOT EXISTS platform_metrics jsonb NOT NULL DEFAULT '{}';

-- platform sütunu: artık tek platform tutuyoruz (text[] yerine text)
-- Eski kayıtlar için geriye dönük uyumluluk: platforms[0] primary platform
-- Yeni kayıtlar platforms dizisi tek elemanlı gelecek
