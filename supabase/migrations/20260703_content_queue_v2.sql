-- v2: Çoklu platform + üretim takibi + içerik metni

-- Yeni sütunlar ekle
ALTER TABLE content_queue
  ADD COLUMN IF NOT EXISTS platforms     TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_text  TEXT,
  ADD COLUMN IF NOT EXISTS voice_url     TEXT,
  ADD COLUMN IF NOT EXISTS video_url     TEXT,
  ADD COLUMN IF NOT EXISTS has_text      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_voice     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_video     BOOLEAN NOT NULL DEFAULT false;

-- Eski tekil platform sütununu migrate et (veri varsa)
UPDATE content_queue
SET platforms = ARRAY[platform]
WHERE platform IS NOT NULL
  AND (platforms IS NULL OR platforms = '{}');

-- Eski sütunu kaldır
ALTER TABLE content_queue DROP COLUMN IF EXISTS platform;

-- content_type CHECK kısıtı varsa kaldır (artık genel formatlar kullanıyoruz)
ALTER TABLE content_queue DROP CONSTRAINT IF EXISTS content_queue_platform_check;
