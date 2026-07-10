-- YOUTUBER rolü: metni yazar ve İçerik Planı'nda seslendirmen atar.
-- NOT: Yeni enum değeri aynı işlem içinde kullanılamaz; politikalar ayrı
-- migration'da (20260716_content_queue_youtuber_policies.sql) güncelleniyor.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'YOUTUBER';
