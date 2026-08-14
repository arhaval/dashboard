-- Hedefler yeni platformları da kapsasın.
--
-- social_goals.platform kısıtı yalnızca dört platformu kabul ediyordu; Kick
-- (Mayıs'ta eklendi), TikTok ve web sitesi (dün eklendi) için hedef
-- girilemiyordu — form kaydederken sessizce hata veriyordu.
--
-- Additive: yalnızca kısıt genişletiliyor, mevcut hedeflere dokunulmuyor.

ALTER TABLE social_goals
  DROP CONSTRAINT IF EXISTS social_goals_platform_check;

ALTER TABLE social_goals
  ADD CONSTRAINT social_goals_platform_check
  CHECK (platform IN ('TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X', 'KICK', 'TIKTOK', 'WEBSITE'));
