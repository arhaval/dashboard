-- Web sitesi üye sayısı.
--
-- Sitenin takipçisi yok ama ÜYESİ var; sosyal platformlardaki takipçinin
-- karşılığı bu. Ayrı bir kolon: `followers_total` sosyal platformların alanı
-- ve orada web sitesi satırı 0 kalıyordu.
--
-- NULLABLE: girilmediyse "veri yok" demek, sıfır üye demek değil.

ALTER TABLE social_monthly_metrics
  ADD COLUMN IF NOT EXISTS members_total INTEGER;

COMMENT ON COLUMN social_monthly_metrics.members_total IS
  'Web sitesi: ay sonundaki toplam kayıtlı üye sayısı (elle girilir).';
