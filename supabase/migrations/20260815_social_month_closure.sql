-- Bir ayı elle "tamamlandı" işaretleyebilmek.
--
-- SORUN: hatırlatma "eksikler dolana kadar" susmuyordu. Geçmişe dönük veri
-- artık alınamıyorsa (platform o kadar geriye istatistik vermiyor, hesap
-- kapanmış, o ay yayın yapılmamış) sistem sonsuza kadar olmayacak bir veriyi
-- istiyordu.
--
-- ÇÖZÜM: ay kapatılır. Kapatılan ay tamamlanmış sayılır; hatırlatma susar,
-- "eksik" uyarısı yerine "kapatıldı" yazar. Veri SİLİNMEZ, girilmiş ne varsa
-- durur; yalnızca "daha fazlası beklenmiyor" denir.
--
-- Ayrı tablo: aylık metrik satırları platform bazlı, kapatma ise ay bazlı bir
-- karar. Metrik tablosuna kolon eklemek onu her platform satırında tekrarlardı.

CREATE TABLE IF NOT EXISTS social_month_closures (
  month VARCHAR(7) PRIMARY KEY,          -- YYYY-MM
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Neden kapatıldı (opsiyonel): "geçmişe dönük veri alınamıyor" gibi.
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE social_month_closures IS
  'Elle tamamlandı işaretlenen aylar. Kapatılan ay için eksik veri istenmez, hatırlatma gönderilmez.';

ALTER TABLE social_month_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_month_closure_read_authenticated" ON social_month_closures;
CREATE POLICY "social_month_closure_read_authenticated" ON social_month_closures
  FOR SELECT USING (auth.role() = 'authenticated');

-- Yazma admin client üzerinden (RLS bypass) yapılır; yine de doğrudan erişim
-- denenirse yalnızca ADMIN yazabilsin.
DROP POLICY IF EXISTS "social_month_closure_admin_write" ON social_month_closures;
CREATE POLICY "social_month_closure_admin_write" ON social_month_closures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
