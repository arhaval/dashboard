-- Yeni tür: "Oyuncu/Takım Hikayesi" (story). Mevcut otomatik atanan (kilitsiz)
-- türleri sıfırla ki yeni sınıflandırıcı — "Genel"e düşen biyografi/belgesel
-- videolarını dahil — hepsini yeniden tasnif etsin. Elle atananlar (locked) korunur.
-- Skor effective_genre üzerinden hesaplandığından bu sıfırlama anında yeniden gruplar.
UPDATE video_performance SET genre = NULL WHERE genre_locked = false;
UPDATE instagram_media   SET genre = NULL WHERE genre_locked = false;
