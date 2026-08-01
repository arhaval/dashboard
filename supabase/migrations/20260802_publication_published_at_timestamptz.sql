-- Elle girilen yayınlarda yayın ANI (tarih + saat) tutulmalı.
--
-- SORUN: published_at DATE idi, yani saat bilgisi yoktu. Ölçüm noktaları
-- (24 Saat / 7 Gün / 30 Gün) yayın anına göre hesaplandığı için, saat bilgisi
-- olmayan bir yayın gece yarısı yayınlanmış sayılıyordu:
--
--   Gerçek yayın              01.08.2026 21:00 (TR)
--   Sistemin varsaydığı       01.08.2026 03:00 (TR) = 00:00 UTC
--   "24 Saat" ölçüm penceresi 02.08 03:00 – 11:00 (tolerans 8 saat)
--   Gerçek 24. saat           02.08 21:00        → pencere çoktan kapanmış
--
-- Sonuç: "24 Saat" etiketli ölçüm aslında ~10-15 saatlik veriyi ölçüyordu.
-- 7 ve 30 günlük noktalar geniş toleransları sayesinde etkilenmiyordu.
--
-- YouTube/Instagram bundan etkilenmiyor: onların yayın anı API'den saat-dakika
-- hassasiyetinde geliyor ve bu kolon o platformlarda zaten NULL kalıyor.
--
-- Veri dönüşümü: DATE → TIMESTAMPTZ cast'i mevcut değerleri o günün gece
-- yarısına sabitler; yani DAVRANIŞ AYNEN KORUNUR, yalnızca bundan sonra saat
-- girilebilir hale gelir. (Bu migration yazılırken tabloda dolu published_at
-- kaydı yoktu, dolayısıyla dönüştürülecek veri de yok.)

ALTER TABLE content_publications
  ALTER COLUMN published_at TYPE TIMESTAMPTZ
  USING published_at::timestamptz;

COMMENT ON COLUMN content_publications.published_at IS
  'Elle girilen platformlarda yayın anı (tarih + saat). Ölçüm noktaları buna göre hesaplanır. Boşsa content_queue.published_date kullanılır. API platformlarında NULL — yayın anı platformun kendi verisinden gelir.';
