-- Motor'da onaylanan final metni dogrudan icerik hattina baglar.
--
-- Hat (Metin -> Ses -> Kurgu -> Hazir -> Yayinlandi) zaten calisiyordu, ama
-- Motor ile arasinda baglanti yoktu: onaylanan her metin icin elle kart acip
-- metni yeniden yapistirmak gerekiyordu. Sonuc: content_queue'daki son kart
-- 1 Agustos'ta kalmis, Motor'daki finaller ise Eylul'de birikmisti.
--
-- script_id iki ise yarar:
--   1) ayni final iki kez gonderilmesin (tekrar kontrolu),
--   2) kart hangi metinden dogdu sorusu cevaplanabilsin (ses linki Motor'da
--      gorunebilsin).
ALTER TABLE content_queue
  ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES ai_scripts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_queue_script ON content_queue(script_id);
