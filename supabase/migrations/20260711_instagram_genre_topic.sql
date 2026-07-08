-- Instagram türleri artık format (reels/post/visual) değil, KONU bazlı:
-- news | interview | analysis | match | celebration | general
-- Eski format-bazlı değerleri temizle; bir sonraki senkronda yeni sınıflandırıcı
-- (caption'a göre) otomatik atar. Format bilgisi content_type'ta zaten korunur.
UPDATE instagram_media
SET genre = NULL, genre_locked = false;
