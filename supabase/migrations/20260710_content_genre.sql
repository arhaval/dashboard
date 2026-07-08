-- İçerik türü (genre) + elle kilit. Skor artık format yerine tür içinde hesaplanır.
-- genre otomatik atanır (başlık/açıklama + format); genre_locked=true ise senkronda
-- üzerine yazılmaz (elle atama kalıcıdır).

ALTER TABLE video_performance
  ADD COLUMN IF NOT EXISTS genre TEXT,                          -- match | interview | analysis | clip | general
  ADD COLUMN IF NOT EXISTS genre_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE instagram_media
  ADD COLUMN IF NOT EXISTS genre TEXT,                          -- news | reels | visual | post
  ADD COLUMN IF NOT EXISTS genre_locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_video_perf_genre ON video_performance(genre);
CREATE INDEX IF NOT EXISTS idx_ig_media_genre ON instagram_media(genre);
