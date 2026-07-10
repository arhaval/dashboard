-- Zinciri kapatan halka: yayınlanan içerik kartını gerçek YouTube videosuna bağla.
-- Böylece fikir → kart → video → performans (izlenme, tür skoru) izlenebilir olur.
-- Opsiyonel: yalnızca Instagram'a çıkan içeriklerde boş kalır.
ALTER TABLE content_queue
  ADD COLUMN IF NOT EXISTS published_video_id TEXT;

CREATE INDEX IF NOT EXISTS idx_content_queue_published_video
  ON content_queue(published_video_id);
