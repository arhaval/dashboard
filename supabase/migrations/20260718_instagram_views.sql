-- Instagram gönderi/reels başına görüntülenme.
-- Medya nesnesi bunu vermiyor; /{media-id}/insights?metric=views ucundan gelir.
-- (instagram_business_manage_insights izni zaten mevcut.)
ALTER TABLE instagram_media
  ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;
