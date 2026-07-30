-- Ölçüm noktası hatırlatmaları.
--
-- Cron 6 saatte bir çalışıyor, ölçüm noktalarının tolerans penceresi ise
-- 8–36 saat. Kayıt tutulmazsa aynı nokta için 30 gün noktasında 6 bildirim
-- birden gider. Bu tablo "bu içerik için bu nokta bildirildi mi" sorusunun
-- tek cevabıdır.
--
-- Additive: yalnızca yeni tablo + index. Mevcut hiçbir şeye dokunmaz.

CREATE TABLE IF NOT EXISTS content_checkpoint_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_queue_id UUID NOT NULL REFERENCES content_queue(id) ON DELETE CASCADE,
  checkpoint TEXT NOT NULL,          -- EARLY_24H | PRIMARY_7D | FINAL_30D
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Bildirim gönderildiğinde elle giriş bekleyen platformlar (denetim için).
  pending_platforms TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bir içerik + nokta için EN FAZLA BİR hatırlatma. Cron kaç kez çalışırsa
-- çalışsın ikinci bildirim veritabanı seviyesinde engellenir.
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkpoint_reminder
  ON content_checkpoint_reminders(content_queue_id, checkpoint);

CREATE INDEX IF NOT EXISTS idx_checkpoint_reminder_sent
  ON content_checkpoint_reminders(sent_at DESC);

COMMENT ON TABLE content_checkpoint_reminders IS
  'Hangi içerik için hangi ölçüm noktasının hatırlatması gönderildi. Tekrar bildirimi engeller.';

ALTER TABLE content_checkpoint_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkpoint_reminder_read_authenticated" ON content_checkpoint_reminders;
CREATE POLICY "checkpoint_reminder_read_authenticated" ON content_checkpoint_reminders
  FOR SELECT USING (auth.role() = 'authenticated');
