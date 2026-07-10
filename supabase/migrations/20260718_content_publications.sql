-- Bir içerik kartı birden fazla platforma çıkar. Her platform için bir yayın kaydı.
-- YOUTUBE / INSTAGRAM: metrikler API'den canlı çözülür (views/likes saklanmaz).
-- TIKTOK / X / TWITCH: otomasyon yok, sayıları kullanıcı elle girer.
-- Bir önceki tekil kolonun yerini alır.

CREATE TABLE IF NOT EXISTS content_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_queue_id UUID NOT NULL REFERENCES content_queue(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,          -- YOUTUBE | INSTAGRAM | TIKTOK | X | TWITCH
  url TEXT,                        -- yayın linki
  external_id TEXT,                -- youtube video_id / instagram shortcode
  views BIGINT,                    -- yalnız elle girilen platformlarda dolu
  likes BIGINT,                    -- yalnız elle girilen platformlarda dolu
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (content_queue_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_content_pub_card ON content_publications(content_queue_id);

ALTER TABLE content_publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read content_publications" ON content_publications;
CREATE POLICY "Authenticated read content_publications" ON content_publications
  FOR SELECT USING (auth.role() = 'authenticated');

-- Tekil kolon artık gereksiz (yazma admin client üzerinden yapılıyor).
ALTER TABLE content_queue DROP COLUMN IF EXISTS published_video_id;
