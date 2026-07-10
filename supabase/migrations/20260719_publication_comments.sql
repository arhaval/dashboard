-- Yayın kaydına yorum sayısı (elle girilen TikTok/X/Twitch için).
-- YouTube/Instagram'ın yorumu zaten kendi tablolarında (comment_count).
ALTER TABLE content_publications
  ADD COLUMN IF NOT EXISTS comments BIGINT;
