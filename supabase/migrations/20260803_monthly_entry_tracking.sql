-- Aylık sosyal medya girişi: TikTok + web sitesi, ve eksik giriş hatırlatması.
--
-- Neden: aylık veriler elle giriliyor ve "bu ay tam giremedim" tekrarlıyor.
-- Eksik girişin görülebilmesi için önce eksik OLABİLECEK her platformun
-- tabloda yeri olmalı. TikTok ve web sitesi şu ana kadar hiç yoktu.

-- ── 1. Yeni platformlar ──────────────────────────────────────────────────────
-- Kick eklenirken kullanılan desenin aynısı: kısıtı düşür, genişlet, geri koy.

ALTER TABLE social_monthly_metrics
  DROP CONSTRAINT IF EXISTS social_monthly_metrics_platform_check;

ALTER TABLE social_monthly_metrics
  ADD CONSTRAINT social_monthly_metrics_platform_check
  CHECK (platform IN ('TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X', 'KICK', 'TIKTOK', 'WEBSITE'));

-- TikTok mevcut genel kolonları kullanır (followers_total, views, likes,
-- comments, saves, shares) — yeni kolon gerekmiyor.

-- ── 2. Web sitesi alanları ───────────────────────────────────────────────────
-- Web sitesinin takipçisi yok; ölçüsü ziyaret ve okunma. NULLABLE: girilmediyse
-- "veri yok" demektir, sıfır değil.

ALTER TABLE social_monthly_metrics
  ADD COLUMN IF NOT EXISTS visitors            INTEGER,  -- tekil ziyaretçi
  ADD COLUMN IF NOT EXISTS page_views          INTEGER,  -- sayfa görüntüleme
  ADD COLUMN IF NOT EXISTS avg_session_seconds INTEGER;  -- ortalama oturum süresi

COMMENT ON COLUMN social_monthly_metrics.visitors IS
  'Web sitesi: aydaki tekil ziyaretçi sayısı (elle girilir).';
COMMENT ON COLUMN social_monthly_metrics.page_views IS
  'Web sitesi: aydaki toplam sayfa görüntüleme (elle girilir).';
COMMENT ON COLUMN social_monthly_metrics.avg_session_seconds IS
  'Web sitesi: ortalama oturum süresi, saniye (elle girilir).';

-- ── 3. Aylık hatırlatma kaydı ────────────────────────────────────────────────
-- Hatırlatma eksik giriş dolana kadar HER GÜN gidiyor. Aynı gün içinde cron
-- birden fazla kez çalışırsa ikinci bildirim gitmemeli — kaydı bu tablo tutar.
-- Ölçüm noktası hatırlatmalarındaki (content_checkpoint_reminders) desenin
-- aynısı; oradaki kayıt içerik+nokta başına, burada ay+gün başına tekil.

CREATE TABLE IF NOT EXISTS social_monthly_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL,          -- hangi ayın girişi için (YYYY-MM)
  sent_on DATE NOT NULL,              -- hangi gün gönderildi
  -- Bildirim gittiğinde eksik olan platformlar (denetim için).
  missing_platforms TEXT[],
  missing_field_count INTEGER,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_social_monthly_reminder
  ON social_monthly_reminders(month, sent_on);

CREATE INDEX IF NOT EXISTS idx_social_monthly_reminder_sent
  ON social_monthly_reminders(sent_at DESC);

COMMENT ON TABLE social_monthly_reminders IS
  'Aylık veri girişi hatırlatmaları. Ay + gün başına tek kayıt; aynı gün ikinci bildirimi engeller.';

ALTER TABLE social_monthly_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_monthly_reminder_read_authenticated" ON social_monthly_reminders;
CREATE POLICY "social_monthly_reminder_read_authenticated" ON social_monthly_reminders
  FOR SELECT USING (auth.role() = 'authenticated');
