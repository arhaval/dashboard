-- Add published_at timestamp to special_posts
-- Set automatically when status changes to YAYINLANDI

ALTER TABLE special_posts
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
