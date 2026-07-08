-- Sponsorluk ödeme planı + finans entegrasyonu
ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'LUMP', -- LUMP | MONTHLY
  ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(12,2);

CREATE TABLE IF NOT EXISTS sponsor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  -- when marked paid, an INCOME transaction is created and linked here
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sponsor_payments_sponsor ON sponsor_payments(sponsor_id);
ALTER TABLE sponsor_payments ENABLE ROW LEVEL SECURITY;
