-- Ölçüm kalitesi + entegrasyon sağlığı.
--
-- İki eksiği kapatır:
--  1. Gün bazlı geri doldurulmuş ölçümler, gerçek zamanda yakalanmış kesin
--     ölçümlerden ayırt edilemiyordu. Aynı "24 Saat" etiketi altında farklı
--     güvenilirlikte iki sayı duruyordu.
--  2. YouTube yetkisi 23 gün boyunca sessizce kopuk kaldı. Hiçbir yerde
--     "en son ne zaman başarıyla senkronize oldu" kaydı yoktu.
--
-- Additive: yalnızca yeni kolon + yeni tablo. Mevcut veri değişmez.

-- ── 1. Snapshot'ın ölçüm kalitesi ────────────────────────────────────────────
ALTER TABLE content_publication_metric_snapshots
  -- REALTIME: API'ye o an soruldu, değer o ana ait.
  -- DAY: günlük geçmiş raporundan kurgulandı, zaman penceresi takvim günü.
  ADD COLUMN IF NOT EXISTS source_granularity TEXT,
  ADD COLUMN IF NOT EXISTS is_backfilled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN content_publication_metric_snapshots.source_granularity IS
  'REALTIME | DAY. DAY ise ölçüm penceresi takvim günüdür, tam yayın saatinden itibaren 24 saat değildir.';
COMMENT ON COLUMN content_publication_metric_snapshots.is_backfilled IS
  'Geriye dönük kurgulandı mı. TRUE ise sayı gerçektir ama zaman penceresi yaklaşıktır.';

-- ── 2. Entegrasyon sağlığı ───────────────────────────────────────────────────
-- Kaynak bazında tutulur (YouTube Data ile Analytics ayrı ayrı bozulabilir);
-- platform seviyesindeki durum bunlardan TÜRETİLİR, ayrıca saklanmaz.
CREATE TABLE IF NOT EXISTS integration_health (
  source TEXT PRIMARY KEY,   -- YOUTUBE_DATA_API | YOUTUBE_ANALYTICS_API | INSTAGRAM_MEDIA | INSTAGRAM_INSIGHTS
  status TEXT NOT NULL,      -- CONNECTED | DEGRADED | DISCONNECTED | REAUTH_REQUIRED

  last_successful_sync_at TIMESTAMPTZ,
  last_attempt_at         TIMESTAMPTZ,
  consecutive_failure_count INTEGER NOT NULL DEFAULT 0,

  -- Teknik hata kodu (invalid_grant gibi) ve kullanıcıya gösterilebilir metin.
  -- Stack trace ya da token BURAYA YAZILMAZ.
  last_error_code TEXT,
  user_safe_error_message TEXT,
  requires_reauthorization BOOLEAN NOT NULL DEFAULT FALSE,

  -- Kaynağın verisinin kapsadığı son gün (YouTube Analytics rapor gecikmesi).
  last_metrics_source_date DATE,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE integration_health IS
  'Kaynak bazında bağlantı sağlığı. Sessiz hata yutmayı engellemek için her sync denemesi buraya yazılır.';

ALTER TABLE integration_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "integration_health_read_authenticated" ON integration_health;
CREATE POLICY "integration_health_read_authenticated" ON integration_health
  FOR SELECT USING (auth.role() = 'authenticated');
