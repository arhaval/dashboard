-- İçerik Kütüphanesi: seçtiğimiz içeriklerin metni.
-- Senkron tüm videoları/gönderileri çekmeye devam eder (tür ortalamaları =
-- skorun paydası). Metni olan kayıtlar kütüphaneyi oluşturur; AI incelemesi
-- bunların üzerinde çalışır (başlık + thumbnail + metin + gerçek rakamlar).
ALTER TABLE video_performance
  ADD COLUMN IF NOT EXISTS script TEXT;

ALTER TABLE instagram_media
  ADD COLUMN IF NOT EXISTS script TEXT;
