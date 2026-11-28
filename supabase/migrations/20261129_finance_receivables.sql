-- Finans: kategori birleştirme + dış ortak (Sangal vb.) tahsilatları
--
-- 1) Kategori birleştirme
--    Aynı kalem farklı adlarla yazılmıştı (eski İngilizce kod, sponsor modülü
--    ve Nakit Akışı kodları). Raporlar bölünüyordu. Tutarlar değişmez; yalnızca
--    kategori adı tek bir Türkçe karşılığa çekilir. Tekrar çalıştırmak zararsız.
--
-- 2) client_collections
--    Dış ortağa yapılan işler (work_items.bill_amount) AY bazında alacak olarak
--    birikir. Para gelince admin "Tahsil edildi" der: bir INCOME transaction
--    (kategori 'Ekstra İşler') oluşur ve buraya bağlanır. Alacak = o ayın
--    faturalanan toplamı − o ayın tahsilatları. Kısmi tahsilata izin verir.

-- ── 1. Kategori birleştirme ─────────────────────────────────────────────────
UPDATE transactions SET category = 'Ekip Ödemeleri'   WHERE category IN ('Team Payments');
UPDATE transactions SET category = 'Sponsorluk'       WHERE category IN ('SPONSORLUK');
UPDATE transactions SET category = 'Reklam Gelirleri' WHERE category IN ('REKLAM');
UPDATE transactions SET category = 'Turnuva'          WHERE category IN ('TURNUVA');
UPDATE transactions SET category = 'Diğer'            WHERE category IN ('DIGER', 'Diger');

-- ── 2. Dış ortak tahsilatları ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_collections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- Tahsil edilen dönem (YYYY-MM): işlerin yapıldığı ay
  month          TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  amount         DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  collected_on   DATE NOT NULL,
  -- Gelir kaydı finanstan silinirse tahsilat da silinir → alacak yeniden açılır.
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  notes          TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_collections_client_month
  ON client_collections(client_id, month);

-- Finans verisi: yalnızca admin.
ALTER TABLE client_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage client collections" ON client_collections;
CREATE POLICY "Admins manage client collections" ON client_collections
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

COMMENT ON TABLE client_collections IS
  'Dış ortaktan (Sangal vb.) ay bazlı tahsilatlar. Alacak = ayın bill_amount toplamı − tahsilatlar.';
