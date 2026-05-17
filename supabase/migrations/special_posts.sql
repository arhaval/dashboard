-- ── İÇERİK FİKİR HAVUZU ─────────────────────────────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor

-- 1. GRAFIKER rolünü user_role enum'una ekle
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GRAFIKER';

-- 2. PostStatus enum oluştur
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM (
    'ONAY_BEKLIYOR',
    'ONAYLANDI',
    'YAYINLANDI',
    'REDDEDILDI'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. special_posts tablosu
CREATE TABLE IF NOT EXISTS special_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  status          post_status NOT NULL DEFAULT 'ONAY_BEKLIYOR',
  platforms       text[] NOT NULL DEFAULT '{}',
  content_type    text NOT NULL,
  caption         text,
  author_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  editor_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  designer_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  -- Performans verileri
  views           int NOT NULL DEFAULT 0,
  likes           int NOT NULL DEFAULT 0,
  comments        int NOT NULL DEFAULT 0,
  shares          int NOT NULL DEFAULT 0,
  saves           int NOT NULL DEFAULT 0,
  engagement_rate float NOT NULL DEFAULT 0.0,
  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 4. İndeksler
CREATE INDEX IF NOT EXISTS idx_special_posts_status     ON special_posts(status);
CREATE INDEX IF NOT EXISTS idx_special_posts_author     ON special_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_special_posts_editor     ON special_posts(editor_id);
CREATE INDEX IF NOT EXISTS idx_special_posts_designer   ON special_posts(designer_id);
CREATE INDEX IF NOT EXISTS idx_special_posts_created_at ON special_posts(created_at DESC);

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_special_posts_updated_at ON special_posts;
CREATE TRIGGER update_special_posts_updated_at
  BEFORE UPDATE ON special_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS
ALTER TABLE special_posts ENABLE ROW LEVEL SECURITY;

-- Herkes kendi gönderilerini görebilir; admin hepsini görür
CREATE POLICY "special_posts_select" ON special_posts
  FOR SELECT USING (
    auth.uid() = author_id
    OR auth.uid() = editor_id
    OR auth.uid() = designer_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Oluşturma: giriş yapmış herkes
CREATE POLICY "special_posts_insert" ON special_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Güncelleme: admin veya ilgili editör/tasarımcı veya yazar
CREATE POLICY "special_posts_update" ON special_posts
  FOR UPDATE USING (
    auth.uid() = author_id
    OR auth.uid() = editor_id
    OR auth.uid() = designer_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Silme: sadece admin
CREATE POLICY "special_posts_delete" ON special_posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
