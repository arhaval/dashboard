-- İçerik Performansı V1 — aynı içeriğin bütün platformlardaki toplam etkisi.
--
-- Gruplama zinciri (content_queue → content_publications) zaten mevcut; burada
-- yalnızca elle girilen platformların (TikTok / X / Twitch) rapor edebildiği
-- metrikler tamamlanıyor. Hepsi NULLABLE: "veri sağlanmadı" ile "gerçekten 0"
-- birbirine karıştırılmamalı, o yüzden DEFAULT 0 YOK.
--
-- Not: X'te impressions bir video izlenmesi DEĞİLDİR. Ayrı kolonda tutulur ve
-- yalnızca toplam erişim (exposure) hesabına girer, toplam izlenmeye girmez.

ALTER TABLE content_publications
  ADD COLUMN IF NOT EXISTS impressions      BIGINT,      -- X: gösterim / erişim
  ADD COLUMN IF NOT EXISTS shares           BIGINT,      -- paylaşım + repost
  ADD COLUMN IF NOT EXISTS saves            BIGINT,      -- kaydetme + bookmark
  ADD COLUMN IF NOT EXISTS followers_gained BIGINT,      -- kazanılan takipçi/abone
  ADD COLUMN IF NOT EXISTS published_at     DATE,        -- platform bazlı yayın tarihi
  ADD COLUMN IF NOT EXISTS title            TEXT;        -- platformdaki başlık (karttan farklıysa)

COMMENT ON COLUMN content_publications.impressions IS
  'Yalnızca elle girilen platformlar. Gösterim sayısı — video izlenmesi ile toplanmaz.';
COMMENT ON COLUMN content_publications.published_at IS
  'Platform bazlı yayın tarihi. Boşsa content_queue.published_date kullanılır.';
