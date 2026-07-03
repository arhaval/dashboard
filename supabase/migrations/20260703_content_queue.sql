-- Content Queue: İçerik planlama ve takip tablosu
CREATE TABLE content_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN ('YOUTUBE', 'INSTAGRAM', 'TWITCH', 'X')),
  content_type  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'HAZIRLANIYOR'
                  CHECK (status IN ('HAZIRLANIYOR', 'HAZIR', 'YAYINLANDI')),
  planned_date  DATE,
  published_date DATE,
  notes         TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_queue_platform    ON content_queue(platform);
CREATE INDEX idx_content_queue_status      ON content_queue(status);
CREATE INDEX idx_content_queue_planned     ON content_queue(planned_date);
CREATE INDEX idx_content_queue_created_by  ON content_queue(created_by);

-- RLS
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;

-- Admin: tam erişim
CREATE POLICY "Admins full access content_queue" ON content_queue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Publisher: tümünü görür, kendi eklediğini düzenler/siler
CREATE POLICY "Publishers select content_queue" ON content_queue
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN','PUBLISHER'))
  );

CREATE POLICY "Publishers insert content_queue" ON content_queue
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN','PUBLISHER'))
  );

CREATE POLICY "Publishers update own content_queue" ON content_queue
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Publishers delete own content_queue" ON content_queue
  FOR DELETE USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
