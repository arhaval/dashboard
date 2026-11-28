-- Planlı yayın: planın kimin için yapılacağı (Arhaval / Sangal gibi dış ortak).
--
-- Neden: maç programı ayrı tutulmuyor; admin yaklaşan yayınları planlı iş
-- olarak ekliyor. Yayın bitince yayıncı "Yayını gir" ile iş girişini planın
-- bilgileriyle (maç, tarih, müşteri) önceden dolu açıyor — ücret de müşteriye
-- göre otomatik çözülüyor. Bunun için planın müşterisini bilmemiz gerekiyor.
--
-- NULL = varsayılan iç müşteri (Arhaval). RLS değişmiyor: admin tam yetkili,
-- kullanıcı sadece kendine atanan planı görür / durumunu günceller.

ALTER TABLE content_plans
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_plans_client ON content_plans(client_id);

COMMENT ON COLUMN content_plans.client_id IS
  'Planın yapılacağı müşteri (Arhaval / dış ortak). NULL = iç iş (Arhaval).';
