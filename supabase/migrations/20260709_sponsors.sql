-- Sponsorluklar modülü
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_path TEXT,                          -- storage path (bucket: sponsors)
  status TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | NEGOTIATING | ENDED
  start_date DATE,
  end_date DATE,
  terms TEXT,                              -- şartlar / anlaşma detayları
  notes TEXT,
  contact TEXT,
  deal_value DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsor_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',  -- contract | logo_pack | other
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,                 -- storage path
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sponsor_files_sponsor ON sponsor_files(sponsor_id);

-- Yalnızca service-role admin client erişir (uygulama admin-gated).
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_files ENABLE ROW LEVEL SECURITY;

-- Storage bucket (private) — logolar, sözleşmeler, logo paketleri
INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsors', 'sponsors', false)
ON CONFLICT (id) DO NOTHING;
