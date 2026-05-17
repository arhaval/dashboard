-- =============================================================================
-- Nakit Akışı Tabloları
-- Supabase Dashboard → SQL Editor'da çalıştır
-- =============================================================================

-- Beklenen Gelirler
CREATE TABLE IF NOT EXISTS expected_income (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  amount       numeric(10,2) NOT NULL,
  category     text NOT NULL DEFAULT 'DIGER', -- SPONSORLUK | REKLAM | TURNUVA | DIGER
  status       text NOT NULL DEFAULT 'BEKLEMEDE', -- BEKLEMEDE | TAHSIL_EDILDI | IPTAL_EDILDI
  expected_date date NOT NULL,
  notes        text,
  received_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expected_income_status ON expected_income(status);
CREATE INDEX IF NOT EXISTS idx_expected_income_date   ON expected_income(expected_date);

-- Beklenen Giderler
CREATE TABLE IF NOT EXISTS expected_expense (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title     text NOT NULL,
  amount    numeric(10,2) NOT NULL,
  category  text NOT NULL DEFAULT 'Diger',
  status    text NOT NULL DEFAULT 'BEKLEMEDE', -- BEKLEMEDE | ODENDI | IPTAL_EDILDI
  due_date  date NOT NULL,
  notes     text,
  paid_at   timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expected_expense_status ON expected_expense(status);
CREATE INDEX IF NOT EXISTS idx_expected_expense_date   ON expected_expense(due_date);

-- RLS: Admin dışında kimse erişemesin
ALTER TABLE expected_income  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expected_expense ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on expected_income"
  ON expected_income FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
  ));

CREATE POLICY "Admin full access on expected_expense"
  ON expected_expense FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
  ));
