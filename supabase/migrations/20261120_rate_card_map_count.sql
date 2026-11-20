-- Yayın (STREAM) fiyatları harita sayısına göre değişir.
--
-- Seslendirme/Kurgu için ayırıcı "uzunluk" (kısa/uzun). Yayın için uzunluk
-- anlamsız; ayırıcı HARİTA SAYISI (2 harita, 3 harita...). Bu yüzden rate_cards
-- ve work_items'a map_count ekliyoruz ve fiyat benzersizliğini buna göre
-- genişletiyoruz.
--
--   Seslendirme/Kurgu → content_length kullanılır, map_count NULL
--   Yayın             → map_count kullanılır, content_length NULL

ALTER TABLE rate_cards
  ADD COLUMN IF NOT EXISTS map_count INTEGER;

ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS map_count INTEGER;

COMMENT ON COLUMN rate_cards.map_count IS
  'Yayın işlerinde harita sayısına göre fiyat. NULL → bu iş türünde harita sayısı kullanılmaz (ör. seslendirme) veya her harita sayısı için geçerli.';
COMMENT ON COLUMN work_items.map_count IS
  'Yayın işinin harita sayısı. Fiyat buna göre çözülür.';

-- Benzersizlik artık harita sayısını da kapsıyor: aynı (kişi, müşteri, iş türü,
-- uzunluk, harita sayısı) için tek fiyat. rate_cards boş olduğu için güvenli.
DROP INDEX IF EXISTS uq_rate_card;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_card
  ON rate_cards (user_id, client_id, work_type, content_length, map_count) NULLS NOT DISTINCT;
