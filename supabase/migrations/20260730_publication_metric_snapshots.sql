-- Yayın metrik snapshot geçmişi.
--
-- Neden ayrı tablo: content_publications / video_performance / instagram_media
-- yalnızca GÜNCEL değeri tutar. "İlk 24 saatte ne yaptı?" sorusu ancak zaman
-- serisi varsa cevaplanabilir. Geçmişin tek gerçek kaynağı burasıdır.
--
-- NULL KURALI (bütün metrik kolonları için):
--   - API alanı vermiyorsa            → NULL
--   - API açıkça 0 döndürüyorsa       → 0
--   - parse edilemeyen değer          → NULL (0 DEĞİL) + sync log'unda hata
-- Bu yüzden HİÇBİR metrik kolonunda DEFAULT 0 ve NOT NULL yoktur.
--
-- Bu migration PRODUCTION'A OTOMATİK UYGULANMAZ. Yalnızca additive:
-- yeni tablo + yeni index, mevcut hiçbir kolona dokunmaz.

CREATE TABLE IF NOT EXISTS content_publication_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES content_publications(id) ON DELETE CASCADE,

  -- YOUTUBE_DATA_API | YOUTUBE_ANALYTICS_API | INSTAGRAM_MEDIA
  -- INSTAGRAM_INSIGHTS | MANUAL | MANUAL_CORRECTION
  source TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Dağıtım ────────────────────────────────────────────────────────────────
  exposure        BIGINT,   -- platformun ANA dağıtım metriği
  views           BIGINT,   -- gerçek içerik/video izlenmesi
  engaged_views   BIGINT,   -- YouTube: gerçekten izlenmiş sayılan görüntülenme
  reach           BIGINT,   -- Instagram: erişilen benzersiz hesap
  impressions     BIGINT,   -- gösterim (X manuel / YouTube Reporting API)

  -- ── Etkileşim ──────────────────────────────────────────────────────────────
  likes           BIGINT,
  comments        BIGINT,
  shares          BIGINT,
  saves           BIGINT,   -- Instagram saved / X bookmark / TikTok save
  total_interactions BIGINT, -- Instagram'ın KENDİ toplamı; likes+comments+... ile TOPLANMAZ

  -- ── İzlenme kalitesi ───────────────────────────────────────────────────────
  -- Süreler HER ZAMAN saniye. Kaynak birim (dakika/milisaniye) adapter
  -- katmanında bir kez çevrilir; buraya çevrilmiş değer yazılır.
  watch_time_seconds              BIGINT,
  average_view_duration_seconds   NUMERIC(12,3),
  average_view_percentage         NUMERIC(6,3),

  -- ── Dönüşüm ────────────────────────────────────────────────────────────────
  -- followers_* platformdan bağımsız ORTAK kavramdır (YouTube'da abone,
  -- Instagram'da takipçi). subscribers_* YouTube'un ham değeridir ve
  -- denetlenebilirlik için ayrıca saklanır — TOPLAMLARA GİRMEZ.
  followers_gained    BIGINT,
  followers_lost      BIGINT,
  subscribers_gained  BIGINT,
  subscribers_lost    BIGINT,

  -- ── Oynatma listesi (YouTube) ──────────────────────────────────────────────
  -- DİKKAT: "kaydetme" DEĞİLDİR. saves ile aynı toplama girmez.
  playlist_adds       BIGINT,
  playlist_removals   BIGINT,
  net_playlist_adds   BIGINT,

  -- ── Ölçüm anı ≠ verinin kapsadığı an ───────────────────────────────────────
  -- YouTube Analytics, istenen endDate'e rağmen bütün metriklerin hazır olduğu
  -- DAHA ERKEN bir güne kadar veri döndürür. Bu yüzden "ne zaman sorduk" ile
  -- "veri hangi güne kadar geçerli" ayrı tutulur; checkpoint'in tamamlanmış
  -- sayılması captured_at'e DEĞİL data_through_date'e bakar.
  report_start_date     DATE,
  requested_end_date    DATE,
  data_through_date     DATE,
  -- Kaynak, istenen aralığın tamamını verebildi mi.
  is_source_data_complete BOOLEAN,
  -- captured_at ile data_through_date sonu arasındaki gecikme.
  source_lag_seconds    INTEGER,

  -- ── Checkpoint zorunlu snapshot'ı ──────────────────────────────────────────
  -- Bir yayın ilk kez 24s/7g/30g penceresine girdiğinde, metrikler öncekiyle
  -- BİREBİR AYNI olsa bile o noktayı belgeleyen bir snapshot yazılır; aksi
  -- halde "değişmedi" diye atlanan ölçüm yüzünden checkpoint hiç oluşmaz.
  -- NULL = olağan (dedupe uygulanan) snapshot.
  forced_for_checkpoint TEXT,   -- EARLY_24H | PRIMARY_7D | FINAL_30D

  -- Hangi metrik istendi / geldi / desteklenmedi (debug + UI "veri yok" ayrımı)
  api_metric_availability JSONB,
  -- YALNIZCA güvenli debug metadata'sı: metrik adları, birimler, tarih aralığı,
  -- API versiyonu, capability. Token veya kişisel veri KOYULMAZ.
  raw_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkpoint çözümlemesi publication + zaman üzerinden tarar.
CREATE INDEX IF NOT EXISTS idx_pub_snapshot_pub_time
  ON content_publication_metric_snapshots(publication_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pub_snapshot_source
  ON content_publication_metric_snapshots(source);

-- Aynı kaynak aynı anı iki kez yazmasın (idempotent sync).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pub_snapshot_source_time
  ON content_publication_metric_snapshots(publication_id, source, captured_at);

-- Bir checkpoint için kaynak başına EN FAZLA BİR zorunlu snapshot. Sync tekrar
-- çalıştığında duplicate oluşmasını veritabanı seviyesinde de engeller.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pub_snapshot_checkpoint
  ON content_publication_metric_snapshots(publication_id, source, forced_for_checkpoint)
  WHERE forced_for_checkpoint IS NOT NULL;

COMMENT ON TABLE content_publication_metric_snapshots IS
  'Yayın metriklerinin zaman serisi. 24s/7g/30g checkpoint''leri buradan türetilir.';
COMMENT ON COLUMN content_publication_metric_snapshots.playlist_adds IS
  'YouTube oynatma listesine ekleme. Instagram "kaydetme" ile AYNI ŞEY DEĞİLDİR, saves toplamına girmez.';
COMMENT ON COLUMN content_publication_metric_snapshots.total_interactions IS
  'Instagram''ın kendi toplam etkileşim değeri. Ham etkileşim toplamına eklenirse çift sayım olur.';
COMMENT ON COLUMN content_publication_metric_snapshots.average_view_duration_seconds IS
  'Saniye. Meta ms, YouTube saniye döndürür; dönüşüm adapter katmanında bir kez yapılır.';
COMMENT ON COLUMN content_publication_metric_snapshots.data_through_date IS
  'Verinin gerçekten kapsadığı son gün. Checkpoint tamamlanmışlığı buna bakar, captured_at''e değil.';
COMMENT ON COLUMN content_publication_metric_snapshots.forced_for_checkpoint IS
  'Dolu ise bu satır 24s/7g/30g noktasını belgelemek için, değerler değişmese bile yazılmıştır.';

-- ── Manuel düzeltme denetim kaydı ────────────────────────────────────────────
-- API snapshot'ı ASLA değiştirilmez; düzeltme yeni bir MANUAL_CORRECTION
-- snapshot'ı olarak yazılır ve gerekçesi burada tutulur.
CREATE TABLE IF NOT EXISTS content_publication_metric_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES content_publications(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES content_publication_metric_snapshots(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metric_key TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pub_metric_audit_pub
  ON content_publication_metric_audit(publication_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Diğer performans tablolarıyla aynı desen: giriş yapmış kullanıcı okur,
-- yazma yalnızca service-role (RLS bypass) ile yapılır.
ALTER TABLE content_publication_metric_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pub_snapshot_read_authenticated" ON content_publication_metric_snapshots;
CREATE POLICY "pub_snapshot_read_authenticated" ON content_publication_metric_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE content_publication_metric_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pub_metric_audit_read_authenticated" ON content_publication_metric_audit;
CREATE POLICY "pub_metric_audit_read_authenticated" ON content_publication_metric_audit
  FOR SELECT USING (auth.role() = 'authenticated');
