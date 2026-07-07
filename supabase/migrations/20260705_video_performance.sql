-- İçerik Performansı: YouTube video metrikleri + Claude yorumları
-- content_type: 'video' | 'short' | 'live' (senkronizasyonda süre/canlı bilgisine göre belirlenir)

CREATE TABLE IF NOT EXISTS video_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,

  view_count BIGINT NOT NULL DEFAULT 0,
  like_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,

  content_type TEXT NOT NULL DEFAULT 'video',   -- 'video' | 'short' | 'live'
  duration_seconds INTEGER NOT NULL DEFAULT 0,

  -- Claude yorumu (bir kez üretilir, saklanır)
  claude_comment TEXT,
  commented_at TIMESTAMPTZ,

  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_perf_published ON video_performance(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_perf_type ON video_performance(content_type);

-- RLS: giriş yapmış kullanıcılar okuyabilir; yazma yalnızca service-role (RLS bypass) ile yapılır.
ALTER TABLE video_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_perf_read_authenticated" ON video_performance;
CREATE POLICY "video_perf_read_authenticated" ON video_performance
  FOR SELECT USING (auth.role() = 'authenticated');
