-- Fikir aşamasında OPSİYONEL öneri (ipucu). Kesin platform/format kararı
-- "Onayla → Aktar" adımında verilir; bu alanlar sadece ekibe fikir vermek için.
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS suggested_platforms TEXT[] NOT NULL DEFAULT '{}',  -- YOUTUBE|INSTAGRAM|TIKTOK|X
  ADD COLUMN IF NOT EXISTS suggested_format TEXT;                             -- Uzun Video|Short|Reels|Gönderi|Canlı
