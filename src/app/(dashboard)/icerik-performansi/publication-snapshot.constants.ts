/**
 * Yayın metrik snapshot'ları ve 24s / 7g / 30g ölçüm noktaları — SAF katman.
 *
 * Checkpoint'ler ayrı kayıt olarak TUTULMAZ; snapshot geçmişinden türetilir.
 * Böylece daha sık snapshot toplandıkça geçmiş checkpoint'ler kendiliğinden
 * daha isabetli hale gelir, veri kopyalanmaz.
 *
 * TEMEL KURAL — veri uydurulmaz:
 *   - hedef zamandan SONRA snapshot yoksa checkpoint "henüz ölçülmedi"dir
 *   - hedeften önceki en yakın snapshot nihai sonuç gibi SUNULMAZ
 *
 * NO server imports.
 */

import {
  EMPTY_METRICS,
  METRIC_KEYS,
  SUPPORTED_METRICS,
  type MetricKey,
  type PlatformMetrics,
} from './content-impact.constants';
import type { ContentPlatform } from '../icerik-plani/content-queue.constants';

// ── Kaynak ───────────────────────────────────────────────────────────────────

export type SnapshotSource =
  | 'YOUTUBE_DATA_API'
  | 'YOUTUBE_ANALYTICS_API'
  | 'INSTAGRAM_MEDIA'
  | 'INSTAGRAM_INSIGHTS'
  | 'MANUAL'
  | 'MANUAL_CORRECTION';

export const SNAPSHOT_SOURCE_LABELS: Record<SnapshotSource, string> = {
  YOUTUBE_DATA_API: 'YouTube Data API',
  YOUTUBE_ANALYTICS_API: 'YouTube Analytics API',
  INSTAGRAM_MEDIA: 'Instagram medya',
  INSTAGRAM_INSIGHTS: 'Instagram insights',
  MANUAL: 'Elle giriş',
  MANUAL_CORRECTION: 'Elle düzeltme',
};

/** Bir metriğin o yayın için API tarafındaki durumu. */
export type MetricAvailability = 'OK' | 'UNSUPPORTED' | 'PERMISSION_MISSING' | 'FAILED';

export type MetricAvailabilityMap = Partial<Record<MetricKey, MetricAvailability>>;

/**
 * Kaynağın verdiği verinin GERÇEKTEN kapsadığı aralık.
 *
 * YouTube Analytics istenen `endDate`'e rağmen bütün metriklerin hazır olduğu
 * daha erken bir güne kadar veri döndürebilir. "Ne zaman sorduk" (capturedAt)
 * ile "veri hangi güne kadar geçerli" (dataThroughDate) ayrı şeylerdir ve
 * checkpoint'in tamamlanmış sayılması İKİNCİSİNE bakar.
 */
export interface SourceCoverage {
  reportStartDate: string | null;
  requestedEndDate: string | null;
  /** Verinin kapsadığı son gün (YYYY-MM-DD). Bilinmiyorsa null. */
  dataThroughDate: string | null;
  /** İstenen aralığın tamamı gelebildi mi. */
  isSourceDataComplete: boolean | null;
  /** capturedAt ile dataThroughDate sonu arasındaki gecikme. */
  sourceLagSeconds: number | null;
}

export const EMPTY_COVERAGE: SourceCoverage = {
  reportStartDate: null,
  requestedEndDate: null,
  dataThroughDate: null,
  isSourceDataComplete: null,
  sourceLagSeconds: null,
};

export interface PublicationSnapshot {
  id: string;
  publicationId: string;
  source: SnapshotSource;
  /** API'ye sorulduğu an (ISO). */
  capturedAt: string;
  metrics: PlatformMetrics;
  availability: MetricAvailabilityMap;
  coverage: SourceCoverage;
  /** Dolu ise bu satır bir ölçüm noktasını belgelemek için zorla yazılmıştır. */
  forcedForCheckpoint: CheckpointKey | null;
}

// ── Ölçüm noktaları ──────────────────────────────────────────────────────────

export type CheckpointKey = 'EARLY_24H' | 'PRIMARY_7D' | 'FINAL_30D';

export const CHECKPOINTS: CheckpointKey[] = ['EARLY_24H', 'PRIMARY_7D', 'FINAL_30D'];

export const CHECKPOINT_LABELS: Record<CheckpointKey, string> = {
  EARLY_24H: '24 Saat',
  PRIMARY_7D: '7 Gün',
  FINAL_30D: '30 Gün',
};

/** Yayından itibaren hedef gecikme (saat). */
export const CHECKPOINT_OFFSET_HOURS: Record<CheckpointKey, number> = {
  EARLY_24H: 24,
  PRIMARY_7D: 24 * 7,
  FINAL_30D: 24 * 30,
};

/**
 * Ölçüm noktası başına kabul edilebilir gecikme.
 *
 * Tek bir sabit tolerans yanlıştı: 24 saatlik noktada 12 saat gecikme sonucu
 * ciddi biçimde değiştirir, 30 günlük noktada aynı 12 saat hiçbir şey ifade
 * etmez. Nokta büyüdükçe tolerans da büyür.
 */
export const CHECKPOINT_TOLERANCE_HOURS: Record<CheckpointKey, number> = {
  EARLY_24H: 8,
  PRIMARY_7D: 18,
  FINAL_30D: 36,
};

/**
 * Ölçümün durumu.
 *   NOT_MEASURED — o noktayı kapsayan hiçbir ölçüm yok. Veri UYDURULMAZ.
 *   PARTIAL      — ölçüm var ama kaynakların bir kısmı o güne kadar veri
 *                  vermemiş (ör. Data API güncel, Analytics gecikmiş).
 *   COMPLETE     — ölçümdeki bütün kaynaklar noktayı kapsıyor.
 */
export type CheckpointStatus = 'NOT_MEASURED' | 'PARTIAL' | 'COMPLETE';

export interface CheckpointResult {
  key: CheckpointKey;
  /** Hedeflenen an (ISO). */
  targetAt: string;
  /** Bulunan ölçümün gerçek yakalanma anı — yoksa null. */
  actualCapturedAt: string | null;
  /** Hedef ile gerçek arasındaki fark (saniye). Ölçüm yoksa null. */
  delaySeconds: number | null;
  snapshotId: string | null;
  /** Ölçüme katkı veren bütün snapshot id'leri (çok kaynaklı ölçüm). */
  snapshotIds: string[];
  /** Hedefe bu noktanın toleransı içinde mi yakalandı. */
  isExact: boolean;
  /** Tolerans dışında yakalandı ama geçerli — kaybedilmez, işaretlenir. */
  isLate: boolean;
  status: CheckpointStatus;
  /** Verisi hedefi kapsamayan kaynaklar (kısmi ölçümün sebebi). */
  laggingSources: SnapshotSource[];
  /** Bu platformun verebileceği metriklerin kaçı dolu (0–1). Ölçüm yoksa 0. */
  dataCompleteness: number;
  metrics: PlatformMetrics | null;
  /** Ölçüm bulunamadı — "henüz ölçülmedi". */
  measured: boolean;
}

function hoursToMs(h: number): number {
  return h * 3600 * 1000;
}

/**
 * Bir platformun verebileceği metriklerin ne kadarı dolu.
 * Payda platforma göre değişir: YouTube'un kaydetme vermemesi Instagram için
 * eksiklik sayılmamalı.
 */
export function dataCompleteness(metrics: PlatformMetrics, platform: ContentPlatform): number {
  const supported = SUPPORTED_METRICS[platform];
  if (supported.length === 0) return 0;
  const filled = supported.filter((k) => metrics[k] != null).length;
  return filled / supported.length;
}

/**
 * Bir checkpoint'i snapshot geçmişinden çöz.
 *
 * Seçim kuralı: hedef andan SONRAKİ ilk snapshot. Hedeften önceki snapshot'lar
 * o noktadaki sonucu göstermez (içerik hâlâ dağıtılıyordur), bu yüzden asla
 * yerine kullanılmaz.
 */
/** YYYY-MM-DD. */
function day(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Bu snapshot'ın verisi hedef anı kapsıyor mu.
 * `dataThroughDate` bilinmiyorsa (canlı sayaçlar: Data API statistics, Instagram
 * medya/insights) veri ölçüm anına kadar geçerlidir → kapsar.
 */
function coversTarget(s: PublicationSnapshot, targetMs: number): boolean {
  const through = s.coverage?.dataThroughDate;
  if (!through) return true;
  return through >= day(targetMs);
}

export function resolveCheckpoint(
  key: CheckpointKey,
  publishedAt: string | null,
  snapshots: PublicationSnapshot[],
  platform: ContentPlatform
): CheckpointResult {
  const base = publishedAt ? new Date(publishedAt).getTime() : NaN;
  const targetMs = Number.isFinite(base) ? base + hoursToMs(CHECKPOINT_OFFSET_HOURS[key]) : NaN;
  const targetAt = Number.isFinite(targetMs) ? new Date(targetMs).toISOString() : '';

  const empty: CheckpointResult = {
    key,
    targetAt,
    actualCapturedAt: null,
    delaySeconds: null,
    snapshotId: null,
    snapshotIds: [],
    isExact: false,
    isLate: false,
    status: 'NOT_MEASURED',
    laggingSources: [],
    dataCompleteness: 0,
    metrics: null,
    measured: false,
  };
  if (!Number.isFinite(targetMs)) return empty;

  // Aynı sync'te yazılan farklı kaynaklar aynı capturedAt'i paylaşır; ölçüm
  // noktası tek bir satır değil, o ANDAKİ bütün kaynakların birleşimidir.
  const after = snapshots
    .filter((s) => new Date(s.capturedAt).getTime() >= targetMs)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  if (after.length === 0) return empty;

  const events = new Map<string, PublicationSnapshot[]>();
  for (const s of after) {
    const arr = events.get(s.capturedAt) ?? [];
    arr.push(s);
    events.set(s.capturedAt, arr);
  }

  for (const [capturedAt, group] of events) {
    const covering = group.filter((s) => coversTarget(s, targetMs));
    // Hiçbir kaynak hedefi kapsamıyorsa bu ölçüm noktayı belgelemiyor —
    // captured_at hedeften sonra olsa bile. Sonraki ölçüme bakılır.
    if (covering.length === 0) continue;

    const actualMs = new Date(capturedAt).getTime();
    const delaySeconds = Math.round((actualMs - targetMs) / 1000);
    const isExact = delaySeconds <= CHECKPOINT_TOLERANCE_HOURS[key] * 3600;
    // Kapsamayan kaynakların verisi de gerçek — silinmez, yalnızca kısmi
    // olduğu işaretlenir.
    const metrics = mergeLatestMetrics(group);
    const lagging = group.filter((s) => !coversTarget(s, targetMs)).map((s) => s.source);

    return {
      key,
      targetAt,
      actualCapturedAt: capturedAt,
      delaySeconds,
      snapshotId: covering[0].id,
      snapshotIds: group.map((s) => s.id),
      isExact,
      isLate: !isExact,
      status: lagging.length === 0 ? 'COMPLETE' : 'PARTIAL',
      laggingSources: [...new Set(lagging)],
      dataCompleteness: dataCompleteness(metrics, platform),
      metrics,
      measured: true,
    };
  }

  return empty;
}

// ── Zorunlu checkpoint snapshot'ı ────────────────────────────────────────────

/**
 * Bu yayın için ŞU AN hangi ölçüm noktalarına zorunlu snapshot yazılmalı.
 *
 * Olağan sync aynı sayıları gördüğünde snapshot yazmaz — doğru davranış, ama
 * yan etkisi şu: bir yayın 24. saatinde hiç hareket etmediyse o noktanın kaydı
 * hiç oluşmaz ve checkpoint sonsuza kadar "ölçülmedi" kalır. Bu yüzden nokta
 * penceresine ilk girişte, değerler aynı olsa bile bir satır yazılır.
 *
 * ÜÇ KORUMA:
 *  1. Yalnızca hedef GEÇİLDİYSE (now >= target).
 *  2. Yalnızca noktanın TOLERANSI İÇİNDEYSE. Aksi halde 40. günde yapılan ilk
 *     sync, bugünkü sayıları 1. günün sonucu gibi yazardı — bu veri uydurmaktır.
 *  3. O noktayı zaten belgeleyen bir ölçüm varsa (zorunlu ya da olağan) tekrar
 *     yazılmaz — duplicate koruması.
 */
export function pendingCheckpoints(
  publishedAt: string | null,
  snapshots: PublicationSnapshot[],
  source: SnapshotSource,
  now: Date = new Date()
): CheckpointKey[] {
  if (!publishedAt) return [];
  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedMs)) return [];
  const nowMs = now.getTime();

  return CHECKPOINTS.filter((key) => {
    const targetMs = publishedMs + hoursToMs(CHECKPOINT_OFFSET_HOURS[key]);
    if (nowMs < targetMs) return false;

    const toleranceMs = hoursToMs(CHECKPOINT_TOLERANCE_HOURS[key]);
    if (nowMs - targetMs > toleranceMs) return false;

    const sameSource = snapshots.filter((s) => s.source === source);
    // Zaten bu nokta için zorla yazılmış bir satır var mı.
    if (sameSource.some((s) => s.forcedForCheckpoint === key)) return false;
    // Ya da olağan bir snapshot noktayı zaten tolerans içinde belgelemiş mi.
    const covered = sameSource.some((s) => {
      const ms = new Date(s.capturedAt).getTime();
      return ms >= targetMs && ms - targetMs <= toleranceMs;
    });
    return !covered;
  });
}

/**
 * Aynı yayının farklı kaynaklardan gelen snapshot'larını tek metrik setine
 * indir. YouTube'da izlenme Data API'den, izlenme süresi Analytics'ten gelir —
 * ikisi ayrı snapshot'tır ve birleştirilmeleri gerekir.
 *
 * Kural: her metrik için EN SON null OLMAYAN değer kazanır. Yeni bir sync bir
 * metriği null döndürdüğü için (desteklenmiyor / geçici hata) daha önce
 * bilinen geçerli değer SİLİNMEZ.
 */
export function mergeLatestMetrics(snapshots: PublicationSnapshot[]): PlatformMetrics {
  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
  const out: PlatformMetrics = { ...EMPTY_METRICS };
  for (const s of ordered) {
    for (const key of METRIC_KEYS) {
      const v = s.metrics[key];
      if (v != null) out[key] = v;
    }
  }
  return out;
}

/** Aynı şekilde birleştirilmiş metrik durumu (hangi metrik neden yok). */
export function mergeAvailability(snapshots: PublicationSnapshot[]): MetricAvailabilityMap {
  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
  const out: MetricAvailabilityMap = {};
  for (const s of ordered) Object.assign(out, s.availability);
  return out;
}

/**
 * İki metrik seti anlamlı biçimde farklı mı — aynı sayılarla gereksiz snapshot
 * yazmamak için. Bütün metrikler aynıysa yeni satır açılmaz.
 */
export function metricsChanged(a: PlatformMetrics | null, b: PlatformMetrics): boolean {
  if (!a) return true;
  return METRIC_KEYS.some((k) => a[k] !== b[k]);
}

// ── Ölçüm noktası hatırlatmaları ─────────────────────────────────────────────

/**
 * Şu an hangi ölçüm noktası için hatırlatma gönderilmeli.
 *
 * Aynı pencere mantığı `pendingCheckpoints` ile kasıtlı olarak AYNI: hatırlatma
 * ancak snapshot'ın hâlâ yazılabileceği aralıkta anlamlıdır. Pencere kapandıktan
 * sonra "sayıları gir" demek, girilse bile o noktaya işlenmeyecek bir veri
 * istemek olurdu.
 *
 * `alreadySent` daha önce bildirilen noktalardır — cron 6 saatte bir çalıştığı
 * için tek pencerede birden fazla bildirim gitmemeli.
 */
export function dueCheckpointReminders(
  publishedAt: string | null,
  alreadySent: CheckpointKey[],
  now: Date = new Date()
): CheckpointKey[] {
  if (!publishedAt) return [];
  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedMs)) return [];
  const nowMs = now.getTime();

  return CHECKPOINTS.filter((key) => {
    if (alreadySent.includes(key)) return false;
    const targetMs = publishedMs + hoursToMs(CHECKPOINT_OFFSET_HOURS[key]);
    if (nowMs < targetMs) return false;
    return nowMs - targetMs <= hoursToMs(CHECKPOINT_TOLERANCE_HOURS[key]);
  });
}

// ── Yaşam döngüsüne göre senkronizasyon sıklığı ──────────────────────────────

/**
 * Bir yayın yaşına göre kaç saatte bir ölçülmeli.
 *
 * Yeni içerik hızlı hareket eder, eski içerik neredeyse durur; sabit sıklık ya
 * ilk günü kaçırır ya da API kotasını boşa harcar.
 */
export function syncIntervalHours(ageHours: number): number {
  if (ageHours < 48) return 6;        // 0–2 gün: günde 4 ölçüm
  if (ageHours < 24 * 7) return 24;   // 2–7 gün: günde 1
  if (ageHours < 24 * 30) return 48;  // 8–30 gün: 2 günde 1
  return 24 * 7;                      // 30 gün sonrası: haftalık
}

/**
 * Bu yayının yeni bir ölçüme ihtiyacı var mı.
 * Hiç ölçülmemişse her zaman evet — geçmiş ancak böyle başlar.
 */
export function isSnapshotDue(
  publishedAt: string | null,
  lastCapturedAt: string | null,
  now: Date = new Date()
): boolean {
  if (!lastCapturedAt) return true;
  const nowMs = now.getTime();
  const publishedMs = publishedAt ? new Date(publishedAt).getTime() : nowMs;
  const ageHours = Math.max(0, (nowMs - publishedMs) / 3_600_000);
  const sinceLastHours = (nowMs - new Date(lastCapturedAt).getTime()) / 3_600_000;
  return sinceLastHours >= syncIntervalHours(ageHours);
}
