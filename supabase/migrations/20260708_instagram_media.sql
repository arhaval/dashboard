-- Instagram İçerik Performansı: per-post metrics + Claude comments.
-- content_type: 'reels' | 'post' | 'carousel' | 'video'

CREATE TABLE IF NOT EXISTS instagram_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id TEXT UNIQUE NOT NULL,
  caption TEXT,
  content_type TEXT NOT NULL DEFAULT 'post',
  permalink TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,

  like_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,

  claude_comment TEXT,
  commented_at TIMESTAMPTZ,

  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_media_published ON instagram_media(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ig_media_type ON instagram_media(content_type);

ALTER TABLE instagram_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ig_media_read_authenticated" ON instagram_media;
CREATE POLICY "ig_media_read_authenticated" ON instagram_media
  FOR SELECT USING (auth.role() = 'authenticated');
