/**
 * İçerik Bazlı Performans — client-safe tipler, merkezi metrik adapter ve
 * saf (deterministik) hesaplama fonksiyonları. NO server imports.
 *
 * Buradaki her fonksiyon saftır: aynı girdi → aynı çıktı. Veri okuma
 * content-impact.service.ts'te, kural bazlı öneriler
 * content-recommendation.service.ts'te.
 *
 * TEMEL KURAL — eksik veri sıfır değildir:
 *   - platform metriği gerçekten 0 ise 0
 *   - platform o metriği vermiyorsa null
 *   - toplamlar yalnızca mevcut (null olmayan) değerleri kullanır ve yanında
 *     veri kapsamını (available/total) taşır
 */

import { scoreToLabel, type PerfLabel } from './perf.constants';
import { PLATFORM_LABELS, type ContentPlatform } from '../icerik-plani/content-queue.constants';

// ── Metrik kavramları ────────────────────────────────────────────────────────

/**
 * Platformların farklı isimlerdeki metrikleri bu ortak kavramlara map edilir.
 * `exposure` platformun ANA DAĞITIM metriği, `views` ise yalnızca gerçek
 * video/içerik izlenmesidir — ikisi bilinçli olarak ayrıdır.
 */
/**
 * Platformlar arasında TOPLANABİLİR metrikler. Bir ortalama (izlenme yüzdesi
 * gibi) platformlar arası toplanamaz — o yüzden ayrı tutulur.
 */
export type SummableMetricKey =
  | 'exposure'
  | 'views'
  | 'engagedViews'
  | 'reach'
  | 'impressions'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'totalInteractions'
  | 'watchTimeSeconds'
  | 'followersGained'
  | 'followersLost'
  | 'playlistAdds'
  | 'playlistRemovals'
  | 'netPlaylistAdds';

/** Toplanamayan (ortalama) metrikler — yalnızca platform bazında gösterilir. */
export type AverageMetricKey = 'averageViewDurationSeconds' | 'averageViewPercentage';

export type MetricKey = SummableMetricKey | AverageMetricKey;

export const SUMMABLE_METRICS: SummableMetricKey[] = [
  'exposure', 'views', 'engagedViews', 'reach', 'impressions',
  'likes', 'comments', 'shares', 'saves', 'totalInteractions',
  'watchTimeSeconds', 'followersGained', 'followersLost',
  'playlistAdds', 'playlistRemovals', 'netPlaylistAdds',
];

export const AVERAGE_METRICS: AverageMetricKey[] = [
  'averageViewDurationSeconds', 'averageViewPercentage',
];

export const METRIC_KEYS: MetricKey[] = [...SUMMABLE_METRICS, ...AVERAGE_METRICS];

export type PlatformMetrics = Record<MetricKey, number | null>;

export const EMPTY_METRICS: PlatformMetrics = {
  exposure: null, views: null, engagedViews: null, reach: null, impressions: null,
  likes: null, comments: null, shares: null, saves: null, totalInteractions: null,
  watchTimeSeconds: null, averageViewDurationSeconds: null, averageViewPercentage: null,
  followersGained: null, followersLost: null,
  playlistAdds: null, playlistRemovals: null, netPlaylistAdds: null,
};

export type MetricUnit = 'count' | 'seconds' | 'percent';

/**
 * METRİĞİN DEPOLAMA TİPİ — kolon tipiyle metrik tipini bağlayan sözleşme.
 *
 * "Ortalama dışındakileri yuvarla" gibi isim tabanlı bir kural kırılgandı:
 * yeni bir oran metriği eklendiğinde sessizce tam sayıya yuvarlanır ve veri
 * bozulurdu. Tip artık metriğin kendi tanımında.
 *
 *   INTEGER_COUNT            → tam sayı adet (BIGINT)
 *   INTEGER_DURATION_SECONDS → tam saniye (BIGINT); ms/dakika buraya çevrilir
 *   DECIMAL_DURATION_SECONDS → ondalıklı saniye (NUMERIC) — hassasiyet korunur
 *   DECIMAL_PERCENTAGE       → yüzde/oran (NUMERIC) — ASLA yuvarlanmaz
 */
export type MetricStorageType =
  | 'INTEGER_COUNT'
  | 'INTEGER_DURATION_SECONDS'
  | 'DECIMAL_DURATION_SECONDS'
  | 'DECIMAL_PERCENTAGE';

export const INTEGER_STORAGE: MetricStorageType[] = ['INTEGER_COUNT', 'INTEGER_DURATION_SECONDS'];

/**
 * MERKEZİ METRİK KATALOĞU — her metriğin ortak adı, birimi, kaynağı ve
 * hangi platformlarda anlamlı olduğu tek yerde tanımlıdır.
 *
 * `apiNames` yalnızca izlenebilirlik içindir: bir sayının hangi API alanından
 * geldiğini kodun içinde aramak zorunda kalmamak için.
 */
export interface MetricSpec {
  /** Toplamlarda kullanılan uzun ad. */
  label: string;
  /** Platform kırılımında kullanılan kısa ad. */
  short: string;
  unit: MetricUnit;
  /** Kolon tipiyle sözleşme — yuvarlama kararı buradan çıkar, isimden değil. */
  storage: MetricStorageType;
  /** Platform → API'deki orijinal alan adı. */
  apiNames: Partial<Record<ContentPlatform, string>>;
  /** Toplanabilir mi (cross-platform). */
  summable: boolean;
  /** Yanlış anlaşılmaması için not (UI'da tooltip). */
  note?: string;
}

export const METRIC_CATALOG: Record<MetricKey, MetricSpec> = {
  exposure: {
    label: 'Toplam platform görünürlüğü', short: 'Görünürlük', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'statistics.viewCount', INSTAGRAM: 'insights.reach|views', X: 'impressions (manuel)' },
    // "Erişim" demek yanlış çağrışım yapıyordu: bu benzersiz kişi sayısı DEĞİL.
    note: 'Platformların ana dağıtım metriklerinin toplamıdır. Benzersiz kişi sayısı değildir; aynı kullanıcı farklı platformlarda veya tekrar izlemelerde birden fazla kez sayılabilir.',
  },
  views: {
    label: 'Toplam içerik izlenmesi', short: 'İzlenme', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'analytics.views | statistics.viewCount', INSTAGRAM: 'insights.views', TIKTOK: 'views (manuel)' },
    // Görünürlüğün alt kümesi DEĞİLDİR: tekrar izlemeler yüzünden ondan büyük olabilir.
    note: 'Yalnızca gerçek içerik/video izlenmesi. X gösterimi buraya girmez. Tekrar izlemeler nedeniyle platform görünürlüğünden yüksek olabilir.',
  },
  engagedViews: {
    label: 'Gerçek izlenme (engaged)', short: 'Engaged', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'analytics.engagedViews' },
    note: 'YouTube’un “gerçekten izlendi” saydığı görüntülenme. Shorts’ta ham izlenmeden farklıdır, yerine kullanılamaz.',
  },
  reach: {
    label: 'Toplam erişilen hesap', short: 'Erişilen', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { INSTAGRAM: 'insights.reach' },
    note: 'Instagram: içeriği gören benzersiz hesap sayısı.',
  },
  impressions: {
    label: 'Toplam gösterim', short: 'Gösterim', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { X: 'impressions (manuel)' },
    note: 'Gösterim bir izlenme değildir; toplam izlenmeye eklenmez.',
  },
  likes: {
    label: 'Toplam beğeni', short: 'Beğeni', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'statistics.likeCount', INSTAGRAM: 'media.like_count' },
  },
  comments: {
    label: 'Toplam yorum', short: 'Yorum', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'statistics.commentCount', INSTAGRAM: 'media.comments_count', X: 'replies (manuel)' },
  },
  shares: {
    label: 'Toplam paylaşım', short: 'Paylaşım', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'analytics.shares', INSTAGRAM: 'insights.shares', X: 'repost (manuel)' },
  },
  saves: {
    label: 'Toplam kaydetme', short: 'Kaydetme', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { INSTAGRAM: 'insights.saved', X: 'bookmark (manuel)', TIKTOK: 'saves (manuel)' },
    note: 'YouTube oynatma listesine ekleme buraya DAHİL DEĞİLDİR — farklı bir eylemdir.',
  },
  totalInteractions: {
    label: 'Meta toplam etkileşim (API)', short: 'Meta toplam', unit: 'count', storage: 'INTEGER_COUNT',
    // Meta'nın KENDİ hesapladığı toplam. Bileşenlerle (beğeni+yorum+paylaşım+
    // kaydetme) aynı şeyi ölçtüğü için çapraz platform toplamına GİRMEZ —
    // yalnızca Instagram platform detayında, kendi bileşenleriyle kıyaslanarak
    // gösterilir. summable:false bunu tip seviyesinde de söyler.
    summable: false,
    apiNames: { INSTAGRAM: 'insights.total_interactions' },
    note: 'Meta’nın kendi hesapladığı toplam. Bileşen toplamıyla (beğeni+yorum+paylaşım+kaydetme) birebir tutmayabilir; ikisi üst üste eklenmez.',
  },
  watchTimeSeconds: {
    label: 'Toplam izlenme süresi', short: 'İzlenme süresi', unit: 'seconds', storage: 'INTEGER_DURATION_SECONDS', summable: true,
    apiNames: { YOUTUBE: 'analytics.estimatedMinutesWatched ×60', INSTAGRAM: 'insights.ig_reels_video_view_total_time' },
  },
  averageViewDurationSeconds: {
    label: 'Ortalama izlenme süresi', short: 'Ort. süre', unit: 'seconds', storage: 'DECIMAL_DURATION_SECONDS', summable: false,
    apiNames: { YOUTUBE: 'analytics.averageViewDuration', INSTAGRAM: 'insights.ig_reels_avg_watch_time' },
    note: 'Ortalamadır; platformlar arası toplanamaz.',
  },
  averageViewPercentage: {
    // "Ort. %" etiketi "%43,8" değeriyle yan yana çift yüzde gibi okunuyordu.
    label: 'Ortalama izlenme yüzdesi', short: 'Tamamlanma', unit: 'percent', storage: 'DECIMAL_PERCENTAGE', summable: false,
    apiNames: { YOUTUBE: 'analytics.averageViewPercentage' },
    note: 'Ortalamadır; platformlar arası toplanamaz.',
  },
  followersGained: {
    label: 'Toplam takipçi/abone kazanımı', short: 'Takipçi +', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'analytics.subscribersGained', INSTAGRAM: 'insights.follows' },
    note: 'Ortak kavram: YouTube’da abone, Instagram’da takipçi.',
  },
  followersLost: {
    label: 'Toplam takipçi/abone kaybı', short: 'Takipçi −', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'analytics.subscribersLost' },
  },
  playlistAdds: {
    label: 'Oynatma listesine ekleme', short: 'Listeye +', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'analytics.videosAddedToPlaylists' },
    note: 'Kaydetme DEĞİLDİR — kaydetme toplamına girmez.',
  },
  playlistRemovals: {
    label: 'Oynatma listesinden çıkarma', short: 'Listeden −', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'analytics.videosRemovedFromPlaylists' },
  },
  netPlaylistAdds: {
    label: 'Net oynatma listesi ekleme', short: 'Liste net', unit: 'count', storage: 'INTEGER_COUNT', summable: true,
    apiNames: { YOUTUBE: 'added − removed' },
  },
};

export const METRIC_LABELS: Record<MetricKey, string> =
  Object.fromEntries(METRIC_KEYS.map((k) => [k, METRIC_CATALOG[k].label])) as Record<MetricKey, string>;

/** Platform kırılımında sütun başlığı olarak kullanılan kısa adlar. */
export const METRIC_SHORT_LABELS: Record<MetricKey, string> =
  Object.fromEntries(METRIC_KEYS.map((k) => [k, METRIC_CATALOG[k].short])) as Record<MetricKey, string>;

/**
 * Ham etkileşim toplamına giren metrikler (başarı skoru DEĞİL).
 * totalInteractions BİLEREK dışarıda: Instagram'ın kendi toplamıdır, eklenirse
 * aynı beğeni/yorum ikinci kez sayılır.
 */
export const ENGAGEMENT_METRICS: MetricKey[] = ['likes', 'comments', 'shares', 'saves'];

/**
 * Bir platformun sağlayabildiği metrikler. Listede olmayan metrik o platform
 * için "veri yok" değil, "API desteklemiyor"dur — UI ikisini ayırır.
 */
export const SUPPORTED_METRICS: Record<ContentPlatform, MetricKey[]> = {
  YOUTUBE: [
    'exposure', 'views', 'engagedViews', 'likes', 'comments', 'shares',
    'watchTimeSeconds', 'averageViewDurationSeconds', 'averageViewPercentage',
    'followersGained', 'followersLost', 'playlistAdds', 'playlistRemovals', 'netPlaylistAdds',
  ],
  INSTAGRAM: [
    'exposure', 'views', 'reach', 'likes', 'comments', 'shares', 'saves',
    'totalInteractions', 'watchTimeSeconds', 'averageViewDurationSeconds', 'followersGained',
  ],
  TIKTOK: ['exposure', 'views', 'likes', 'comments', 'shares', 'saves', 'followersGained'],
  X: ['exposure', 'impressions', 'views', 'likes', 'comments', 'shares', 'saves', 'followersGained'],
  TWITCH: ['exposure', 'views', 'likes', 'comments', 'shares', 'followersGained'],
};

/** Verinin nereden geldiği. */
export type DataSource = 'API' | 'MANUAL';

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  API: 'API',
  MANUAL: 'Manuel',
};

/**
 * Her platform için `exposure` hangi alandan geliyor — merkezi karar.
 * Instagram'da reach mevcut senkronizasyonda gelmiyor, o yüzden views'a düşer.
 */
export const EXPOSURE_BASIS: Record<ContentPlatform, string> = {
  YOUTUBE: 'izlenme',
  INSTAGRAM: 'izlenme',
  TIKTOK: 'izlenme',
  X: 'gösterim',
  TWITCH: 'izlenme',
};

/** Bir metriğin depolama tipi tam sayı mı. */
export function isIntegerMetric(key: MetricKey): boolean {
  return INTEGER_STORAGE.includes(METRIC_CATALOG[key].storage);
}

export interface StorageNormalizeResult {
  value: number | null;
  /** Değer kolon tipine uymadığı için düzeltildiyse açıklaması. */
  adjusted?: string;
  /** Değer hiçbir şekilde saklanamaz — null'a düşürüldü. */
  rejected?: string;
}

/**
 * Bir metriği KENDİ depolama tipine göre yazıma hazırla.
 *
 * Bu, "ortalama dışındakileri yuvarla" kuralının yerini alır: karar metriğin
 * adından değil, katalogdaki tipinden çıkar. Yeni bir oran metriği eklendiğinde
 * yanlışlıkla tam sayıya yuvarlanamaz.
 *
 * Bir metrik saklanamaz durumdaysa (sonsuz, NaN) TEK BAŞINA null'a düşer ve
 * gerekçesi raporlanır — bütün ölçümün kaybolmasına izin verilmez.
 */
export function normalizeForStorage(key: MetricKey, value: number | null): StorageNormalizeResult {
  if (value == null) return { value: null };
  if (!Number.isFinite(value)) {
    return { value: null, rejected: `${key}: sayı değil (${value})` };
  }

  const storage = METRIC_CATALOG[key].storage;
  if (!INTEGER_STORAGE.includes(storage)) {
    // Oran ve ortalama süreler ondalık kalır — yuvarlamak bilgiyi yok eder.
    return { value };
  }

  if (Number.isInteger(value)) return { value };
  // Milisaniyeden çevrilen toplam süreler ve nadiren ondalık dönen sayaçlar.
  return {
    value: Math.round(value),
    adjusted: `${key}: ${storage} olduğu için ${value} → ${Math.round(value)}`,
  };
}

/**
 * Bir platform bu metriği HİÇ vermiyor mu. "Veri yok" (henüz gelmedi) ile
 * "API desteklemiyor" (hiç gelmeyecek) farkını UI'ın ayırabilmesi için.
 */
export function isUnsupported(platform: ContentPlatform, key: MetricKey): boolean {
  return !SUPPORTED_METRICS[platform].includes(key);
}

/** Bir platformda gösterilmesi anlamlı olan metrikler, katalog sırasında. */
export function metricsFor(platform: ContentPlatform): MetricKey[] {
  return METRIC_KEYS.filter((k) => SUPPORTED_METRICS[platform].includes(k));
}

// ── Toplamlar + veri kapsamı ─────────────────────────────────────────────────

export interface MetricTotal {
  /** Yalnızca mevcut değerlerin toplamı. Hiç veri yoksa null (0 değil). */
  value: number | null;
  /** Bu metriği raporlayan platform sayısı. */
  available: number;
  /** İçeriğin yayınlandığı toplam platform sayısı. */
  total: number;
}

/**
 * Toplamlar YALNIZCA toplanabilir metrikler için üretilir. Ortalama metrikler
 * (izlenme yüzdesi gibi) burada bilerek yok — platformlar arası toplanamazlar.
 */
export type ImpactTotals = Record<SummableMetricKey, MetricTotal> & {
  /** likes + comments + shares + saves — HAM toplam, başarı skoru değil. */
  engagements: MetricTotal;
};

// ── Platform kırılımı ────────────────────────────────────────────────────────

/**
 * Bir platformun skoru neye dayanıyor. Sıra = fallback önceliği.
 * Ham görüntülenme asla doğrudan karşılaştırma ölçütü değildir.
 */
export type ScoreBasis =
  /** Mevcut platform performans skoru (tür içi oran) — tercih edilen. */
  | 'PLATFORM_SCORE'
  /** Platform içi normalize edilmiş erişim oranı. */
  | 'PLATFORM_RATIO'
  /** Etkileşim oranı (etkileşim / erişim), platform ortalamasına göre. */
  | 'ENGAGEMENT_RATE'
  /** Karşılaştırılabilir veri yok. */
  | 'NONE';

export const SCORE_BASIS_LABELS: Record<ScoreBasis, string> = {
  PLATFORM_SCORE: 'platform tür skoru',
  PLATFORM_RATIO: 'platform içi erişim oranı',
  ENGAGEMENT_RATE: 'etkileşim oranı',
  NONE: 'veri yetersiz',
};

export interface PlatformPublication {
  platform: ContentPlatform;
  /** content_publications satır id'si — snapshot geçmişinin anahtarı. */
  publicationId: string;
  /** Platformdaki yayın başlığı (yoksa kart başlığı). */
  title: string;
  url: string | null;
  externalId: string | null;
  publishedAt: string | null;
  source: DataSource;
  metrics: PlatformMetrics;
  /** exposure'ın hangi alandan alındığı — açıklanabilirlik için. */
  exposureBasis: string;
  /** 1.0 = platform ortalaması. Karşılaştırılamıyorsa null. */
  score: number | null;
  scoreBasis: ScoreBasis;
  label: PerfLabel;
  /** Mevcut sistemdeki tür adı (varsa) — "Klip", "Haber/Duyuru" vb. */
  genreLabel: string | null;
  /**
   * Metrik başına API durumu — "veri yok" ile "API desteklemiyor" ayrımı.
   * Snapshot toplanmamış yayınlarda boştur.
   */
  availability: Partial<Record<MetricKey, 'OK' | 'UNSUPPORTED' | 'PERMISSION_MISSING' | 'FAILED'>>;
  /**
   * 24s / 7g / 30g ölçüm noktaları. Snapshot yoksa hepsi `measured: false`
   * gelir — veri UYDURULMAZ.
   */
  checkpoints: PublicationCheckpoint[];
  /** Kaç snapshot toplandı (geçmişin derinliği). */
  snapshotCount: number;
}

/**
 * Drawer'ın gösterebilmesi için sadeleştirilmiş checkpoint.
 * Tam çözümleme publication-snapshot.constants.ts'te.
 */
export interface PublicationCheckpoint {
  key: 'EARLY_24H' | 'PRIMARY_7D' | 'FINAL_30D';
  measured: boolean;
  targetAt: string;
  actualCapturedAt: string | null;
  delaySeconds: number | null;
  /** Noktanın kendi toleransı içinde yakalandı mı. */
  isExact: boolean;
  /** Tolerans dışında ama geçerli ölçüm — kaybedilmez, işaretlenir. */
  isLate: boolean;
  /** PARTIAL: ölçüm var ama bir kaynağın verisi o güne kadar hazır değildi. */
  status: 'NOT_MEASURED' | 'PARTIAL' | 'COMPLETE';
  /** Ölçümün ne kadar isabetli olduğu — kesin / yaklaşık / gecikmeli / kısmi. */
  measurementQuality: 'EXACT_REALTIME' | 'APPROX_DAILY_BACKFILL' | 'LATE_MEASUREMENT' | 'PARTIAL_SOURCE_DATA';
  sourceGranularity: 'REALTIME' | 'DAY';
  dataThroughDate: string | null;
  isBackfilled: boolean;
  isSourceDataComplete: boolean;
  /** Kısmi ölçümün sebebi olan kaynaklar. */
  laggingSources: string[];
  dataCompleteness: number;
  metrics: PlatformMetrics | null;
}

// ── Genel durum ──────────────────────────────────────────────────────────────

export type OverallStatus = 'VERI_YETERSIZ' | 'ZAYIF' | 'ORTA' | 'GUCLU' | 'COK_GUCLU';

export const OVERALL_STATUS_META: Record<OverallStatus, { text: string; bg: string; color: string }> = {
  VERI_YETERSIZ: { text: 'Veri Yetersiz', bg: 'var(--color-info-muted)',    color: 'var(--color-info)' },
  ZAYIF:         { text: 'Zayıf',         bg: 'var(--color-error-muted)',   color: 'var(--color-error)' },
  ORTA:          { text: 'Orta',          bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  GUCLU:         { text: 'Güçlü',         bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
  COK_GUCLU:     { text: 'Çok Güçlü',     bg: 'var(--color-accent-muted)',  color: 'var(--color-accent)' },
};

export const OVERALL_STATUSES: OverallStatus[] = ['COK_GUCLU', 'GUCLU', 'ORTA', 'ZAYIF', 'VERI_YETERSIZ'];

export interface OverallVerdict {
  status: OverallStatus;
  /** Karşılaştırılabilir skoru olan platform sayısı. */
  scoredPlatforms: number;
  /** Yayın yapılan platform sayısı. */
  publishedPlatforms: number;
  /** "yalnızca Instagram verisine dayanıyor" gibi kapsam notu. */
  note: string;
}

// ── Karşılaştırma ────────────────────────────────────────────────────────────

export interface PlatformRank {
  platform: ContentPlatform;
  score: number;
  basis: ScoreBasis;
  /** "Instagram — mevcut platform ortalamasının 1,64 katı" */
  explanation: string;
}

export interface PlatformComparison {
  strongest: PlatformRank | null;
  weakest: PlatformRank | null;
  /** Karşılaştırmaya giren platform sayısı. */
  comparable: number;
}

// ── Öneri motoru çıktısı ─────────────────────────────────────────────────────

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Aksiyonun ANLAM kümesi. Farklı kurallar aynı işi öneren aksiyonlar üretebilir
 * ("çapraz paylaş" ile "planlanan platformu tamamla" aynı işi anlatır); aynı
 * gruptan yalnızca en yüksek öncelikli aksiyon kalır. Kural sayısı arttıkça
 * listeyi tekrarla şişirmemenin tek yolu bu.
 */
export type ActionGroup =
  /** Ölçüm eksik — önce veri tamamlanmalı. */
  | 'DATA'
  /** İçeriği başka/eksik platforma taşı. */
  | 'DISTRIBUTE_WIDER'
  /** Aynı platformda dağıtımı güçlendir (başlık, kapak, etiket, saat). */
  | 'BOOST_REACH'
  /** Zayıf kalan platform için paketlemeyi/açılışı düzelt. */
  | 'FIX_WEAK_PLATFORM'
  /** Güçlü platformun paketleme biçimini tekrar kullan. */
  | 'REUSE_WINNER'
  /** Konu seçimini gözden geçir. */
  | 'REVISE_IDEA'
  /** Bu fikirden devam içeriği üret. */
  | 'FOLLOW_UP'
  /** Aynı formatı başka konuya/oyuncuya uygula. */
  | 'REAPPLY_FORMAT'
  /** Kaydedilebilir / carousel format önerisi. */
  | 'IG_FORMAT'
  /** Fikri bir süre tekrarlama. */
  | 'STOP_IDEA'
  /** Başarısız örnek olarak incelemeye gönder. */
  | 'REVIEW';

export interface RecommendedAction {
  code: string;
  label: string;
  /** Bu aksiyonun NEDEN üretildiği — sayıya dayanmalı. */
  reason: string;
  priority: RecommendationPriority;
  group: ActionGroup;
}

/**
 * Bir içerik için dönülebilecek en fazla aksiyon.
 *
 * Dörtten üçe indirildi: dördüncü aksiyon pratikte hep "veriyi tamamla" gibi
 * ikincil bir madde oluyordu ve asıl kararı seyreltiyordu. Üç slot var —
 * ana aksiyon, platform uyarlaması, kontrollü devam.
 */
export const MAX_ACTIONS = 3;

export interface ContentRecommendationResult {
  observation: string[];
  interpretation: string[];
  /** En fazla MAX_ACTIONS, anlam grubuna göre tekilleştirilmiş, önceliğe göre sıralı. */
  actions: RecommendedAction[];
  triggeredRules: string[];
}

// ── Bir içeriğin toplam etkisi ───────────────────────────────────────────────

export interface ContentImpact {
  cardId: string;
  /** Kısa, okunabilir ana içerik kodu (uuid'in ilk 8 hanesi). */
  code: string;
  title: string;
  /** Kartın format/tür alanı ("Short / Reels", "Video" …) — filtre ölçütü. */
  contentType: string;
  /** Metni (script) elimizde olan içerik — "kütüphanede" sayılır. */
  inLibrary: boolean;
  /** Herhangi bir platformdaki en erken yayın tarihi. */
  firstPublishedAt: string | null;
  /** Kartta planlanmış platformlar (yayınlanmamış olanlar dahil). */
  plannedPlatforms: ContentPlatform[];
  publications: PlatformPublication[];
  totals: ImpactTotals;
  comparison: PlatformComparison;
  verdict: OverallVerdict;
  thumbnail: string | null;
  recommendation: ContentRecommendationResult;
}

// ── Platform içi kıyas ölçütleri ─────────────────────────────────────────────

export interface PlatformBenchmark {
  platform: ContentPlatform;
  /** Platform içi ortalama erişim (0'lar hariç). null = yetersiz örnek. */
  avgExposure: number | null;
  /** Platform içi ortalama etkileşim oranı. null = yetersiz örnek. */
  avgEngagementRate: number | null;
  sampleSize: number;
}

/**
 * Fallback skorların güvenilir sayılması için gereken minimum örnek.
 * Mevcut platform skoru için MIN_SAMPLE_PER_TYPE (5) kullanılır; fallback
 * platform bazında çalıştığı için eşik biraz daha düşük tutulur.
 */
export const MIN_SAMPLE_FOR_FALLBACK = 3;

// ── Saf yardımcılar ──────────────────────────────────────────────────────────

/** Türkçe biçimli oran: 1.64 → "1,64". */
export function fmtRatio(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** UUID → okunabilir içerik kodu. */
export function contentCode(cardId: string): string {
  return cardId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

/** Tam sayı gösterimi (tr-TR). */
export function fmtInt(n: number): string {
  return n.toLocaleString('tr-TR');
}

/** Kısa sayı gösterimi: 42900 → "42,9B". */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}B`;
  return fmtInt(n);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' });
}

/**
 * Metrik gösterimi. Veri yoksa sahte sıfır YAZMA — "—" göster.
 * Gerçek 0 ise 0 gösterilir.
 */
export function fmtMetric(v: number | null): string {
  return v == null ? '—' : fmtInt(v);
}

/** Saniye → "4dk 12sn" / "1sa 03dk". */
export function fmtDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk ${String(s % 60).padStart(2, '0')}sn`;
  return `${Math.floor(m / 60)}sa ${String(m % 60).padStart(2, '0')}dk`;
}

/** Birim farkındalıklı metrik gösterimi — süre saniye olarak yazılmaz. */
export function fmtMetricValue(key: MetricKey, v: number | null): string {
  const unit = METRIC_CATALOG[key].unit;
  if (v == null) return '—';
  if (unit === 'seconds') return fmtDuration(v);
  if (unit === 'percent') return `%${v.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
  return fmtInt(v);
}

/**
 * Toplam Etki bölümünde HER ZAMAN gösterilen çekirdek metrikler.
 * Diğerleri yalnızca veri geldiyse görünür — 16 kutuluk bir duvar kurmuyoruz.
 */
export const CORE_TOTALS: SummableMetricKey[] = [
  'exposure', 'views', 'likes', 'comments', 'shares', 'saves', 'followersGained',
];

/**
 * Gösterim önceliği (§14): önce erişim, sonra izlenme kalitesi,
 * sonra paylaşım/kaydetme, en sonda dönüşüm ve ikincil sayaçlar.
 */
export const TOTALS_ORDER: SummableMetricKey[] = [
  'exposure', 'views', 'engagedViews', 'reach', 'impressions',
  'watchTimeSeconds',
  'likes', 'comments', 'shares', 'saves', 'totalInteractions',
  'followersGained', 'followersLost',
  'netPlaylistAdds', 'playlistAdds', 'playlistRemovals',
];

/**
 * Bir metriği yayınlar arasında topla. Yalnızca null olmayan değerler girer;
 * hiçbiri yoksa value null döner (0 değil).
 */
export function sumMetric(pubs: PlatformPublication[], key: MetricKey): MetricTotal {
  let sum = 0;
  let available = 0;
  for (const p of pubs) {
    const v = p.metrics[key];
    if (v == null) continue;
    sum += v;
    available += 1;
  }
  return { value: available > 0 ? sum : null, available, total: pubs.length };
}

/**
 * Ham etkileşim toplamı: likes + comments + shares + saves.
 * `available` = bu dört metrikten en az birini raporlayan platform sayısı.
 */
export function sumEngagements(pubs: PlatformPublication[]): MetricTotal {
  let sum = 0;
  let available = 0;
  for (const p of pubs) {
    let has = false;
    for (const key of ENGAGEMENT_METRICS) {
      const v = p.metrics[key];
      if (v == null) continue;
      sum += v;
      has = true;
    }
    if (has) available += 1;
  }
  return { value: available > 0 ? sum : null, available, total: pubs.length };
}

export function buildTotals(pubs: PlatformPublication[]): ImpactTotals {
  const totals = {} as ImpactTotals;
  // Ortalama metrikler BİLEREK atlanır — toplanmaları anlamsız olurdu.
  for (const key of SUMMABLE_METRICS) totals[key] = sumMetric(pubs, key);
  totals.engagements = sumEngagements(pubs);
  return totals;
}

/** Bir yayının etkileşim oranı: mevcut etkileşimler / erişim. */
export function engagementRate(p: { metrics: PlatformMetrics }): number | null {
  const exposure = p.metrics.exposure;
  if (exposure == null || exposure <= 0) return null;
  let sum = 0;
  let has = false;
  for (const key of ENGAGEMENT_METRICS) {
    const v = p.metrics[key];
    if (v == null) continue;
    sum += v;
    has = true;
  }
  return has ? sum / exposure : null;
}

/**
 * En güçlü / en zayıf platform. Ham görüntülenmeye göre DEĞİL — yalnızca
 * karşılaştırılabilir skoru (platform ortalamasına göre oran) olan platformlar
 * yarışır, çünkü platform ölçekleri farklıdır.
 */
export function comparePlatforms(pubs: PlatformPublication[]): PlatformComparison {
  const scored = pubs.filter((p) => p.score != null) as (PlatformPublication & { score: number })[];
  if (scored.length === 0) return { strongest: null, weakest: null, comparable: 0 };

  const rank = (p: PlatformPublication & { score: number }): PlatformRank => ({
    platform: p.platform,
    score: p.score,
    basis: p.scoreBasis,
    explanation: `${PLATFORM_LABELS[p.platform]} — mevcut platform ortalamasının ${fmtRatio(p.score)} katı (${SCORE_BASIS_LABELS[p.scoreBasis]})`,
  });

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  return {
    strongest: rank(sorted[0]),
    // Tek platformlu içerikte "en zayıf" bilgi taşımaz.
    weakest: sorted.length > 1 ? rank(sorted[sorted.length - 1]) : null,
    comparable: scored.length,
  };
}

/**
 * Bir skoru gündelik dille anlat.
 *
 * Eşikler skor ETİKETLERİNE değil 1,0'a (platform ortalaması) göredir: 0,84
 * teknik olarak "AVERAGE" etiketine girse de kullanıcıya "ortalamada" demek
 * yanıltıcı olur — ortalamanın %16 altındadır.
 */
export function scorePhrase(score: number): string {
  if (score >= 1.5) return 'çok güçlü';
  if (score >= 1.2) return 'başarılı';
  if (score >= 0.95) return 'ortalamada';
  if (score >= 0.7) return 'ortalamanın altında';
  return 'belirgin zayıf';
}

/**
 * Platformlar arasında "aynı sonucu verdi" demek için kabul edilen en fazla fark.
 * Bunun üstünde tek kelimelik bir genel durum yanıltıcı olur.
 */
const VARIANCE_RATIO = 1.35;

export interface VerdictHeadline {
  /** Kullanıcıya gösterilecek ana mesaj. */
  title: string;
  /** Mesajı gerekçelendiren alt metin. */
  detail: string;
  /** Sonuç platforma göre belirgin biçimde değişiyor mu. */
  variesByPlatform: boolean;
}

/**
 * Genel durumu tek kelimeye sıkıştırmak yanıltıcı olabiliyor: YouTube 1,21x,
 * Instagram 0,84x iken "Orta" demek ikisini de yanlış anlatır. Platformlar
 * arasında ciddi fark varsa ana mesaj FARKI anlatır; genel skor etiketi
 * kaybolmaz, alt metinde durmaya devam eder.
 */
export function verdictHeadline(
  publications: PlatformPublication[],
  verdict: OverallVerdict
): VerdictHeadline {
  const scored = publications
    .filter((p): p is PlatformPublication & { score: number } => p.score != null)
    .sort((a, b) => b.score - a.score);

  const fallback = OVERALL_STATUS_META[verdict.status].text;
  if (scored.length < 2) {
    return { title: fallback, detail: verdict.note, variesByPlatform: false };
  }

  const best = scored[0];
  const worst = scored[scored.length - 1];
  const varies = worst.score > 0 && best.score / worst.score >= VARIANCE_RATIO;

  const perPlatform = scored
    .map((p) => `${PLATFORM_LABELS[p.platform]} ${scorePhrase(p.score)} (${fmtRatio(p.score)}x)`)
    .join(', ');

  return varies
    ? { title: 'Platforma göre değişiyor', detail: `${perPlatform}.`, variesByPlatform: true }
    : { title: fallback, detail: `${perPlatform}.`, variesByPlatform: false };
}

/**
 * Genel durum — yeni bir skor algoritması DEĞİL: mevcut platform skorlarının
 * etiketlerinden açıklanabilir bir özet üretir.
 */
export function deriveOverallStatus(pubs: PlatformPublication[]): OverallVerdict {
  const scored = pubs.filter((p) => p.score != null);
  const published = pubs.length;

  if (scored.length === 0) {
    return {
      status: 'VERI_YETERSIZ',
      scoredPlatforms: 0,
      publishedPlatforms: published,
      note: published === 0
        ? 'hiçbir platformda yayın kaydı yok'
        : `${published} platformda yayınlandı, hiçbirinde karşılaştırılabilir skor yok`,
    };
  }

  const labels = scored.map((p) => p.label);
  const hits = labels.filter((l) => l === 'HIT').length;
  const strong = labels.filter((l) => l === 'HIT' || l === 'GOOD').length;
  const weak = labels.filter((l) => l === 'FLOP').length;

  let status: OverallStatus;
  if (hits >= 2) status = 'COK_GUCLU';
  else if (strong * 2 > scored.length) status = 'GUCLU';
  else if (weak * 2 > scored.length) status = 'ZAYIF';
  else status = 'ORTA';

  // Tek platformlu içeriği "genel platformlar başarısı" gibi sunmuyoruz. Tek
  // skorlu platform varken kaç platforma çıkıldığı da gizlenmemeli.
  const note = scored.length === 1
    ? `yalnızca ${PLATFORM_LABELS[scored[0].platform]} verisine dayanıyor` +
      (published > 1 ? ` (${published} platformdan 1'i)` : '')
    : `${scored.length}/${published} platformun skoruna dayanıyor`;

  return { status, scoredPlatforms: scored.length, publishedPlatforms: published, note };
}

// ── Filtre / sıralama / sayfalama sözleşmesi ─────────────────────────────────

/** Sıralama seçenekleri (§13). */
export type ContentImpactSort =
  | 'NEWEST'
  | 'OLDEST'
  | 'EXPOSURE'
  | 'ENGAGEMENT'
  | 'STATUS'
  | 'PLATFORMS';

export const SORT_LABELS: Record<ContentImpactSort, string> = {
  NEWEST: 'En yeni',
  OLDEST: 'En eski',
  EXPOSURE: 'En yüksek erişim',
  ENGAGEMENT: 'En yüksek etkileşim',
  STATUS: 'En güçlü genel durum',
  PLATFORMS: 'En çok platform',
};

export const SORT_OPTIONS: ContentImpactSort[] = ['NEWEST', 'OLDEST', 'EXPOSURE', 'ENGAGEMENT', 'STATUS', 'PLATFORMS'];

/** Tek platformlu / çok platformlu ayrımı. */
export type PlatformReach = 'ALL' | 'SINGLE' | 'MULTI';

export const REACH_LABELS: Record<PlatformReach, string> = {
  ALL: 'Tek/çok platform farketmez',
  SINGLE: 'Yalnızca tek platformda',
  MULTI: 'Birden fazla platformda',
};

/** Metni (script) elimizde olan içerikler. */
export type LibraryFilter = 'ALL' | 'IN_LIBRARY' | 'NOT_IN_LIBRARY';

export const LIBRARY_LABELS: Record<LibraryFilter, string> = {
  ALL: 'Kütüphane farketmez',
  IN_LIBRARY: 'Kütüphanede olanlar',
  NOT_IN_LIBRARY: 'Kütüphanede olmayanlar',
};

export const ALL = 'ALL' as const;

export interface ContentImpactQuery {
  /** Başlık ve içerik kodunda arama (Türkçe duyarsız). */
  search: string;
  /** İlk yayın tarihi aralığı (YYYY-MM-DD, dahil). */
  from: string | null;
  to: string | null;
  /** Kartın format alanı, ya da 'ALL'. */
  contentType: string;
  /** İçeriğin YAYINLANDIĞI platformlar — hepsi sağlanmalı (AND). Boş = filtre yok. */
  platforms: ContentPlatform[];
  reach: PlatformReach;
  status: OverallStatus | typeof ALL;
  library: LibraryFilter;
  sort: ContentImpactSort;
  /** 1 tabanlı. */
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const DEFAULT_IMPACT_QUERY: ContentImpactQuery = {
  search: '',
  from: null,
  to: null,
  contentType: ALL,
  platforms: [],
  reach: 'ALL',
  status: ALL,
  library: 'ALL',
  sort: 'NEWEST',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

export interface ContentImpactFacets {
  platforms: { platform: ContentPlatform; count: number }[];
  statuses: { status: OverallStatus; count: number }[];
  contentTypes: { value: string; count: number }[];
}

export interface ContentImpactPage {
  /** YALNIZCA istenen sayfa — client'a bütün korpus gönderilmez. */
  items: ContentImpact[];
  /** Filtre sonrası eşleşen içerik sayısı. */
  total: number;
  /** Filtresiz toplam içerik sayısı. */
  grandTotal: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** Filtre seçeneklerinin sayıları — filtresiz korpustan hesaplanır. */
  facets: ContentImpactFacets;
  /** Hiçbir ana içeriğe bağlı olmayan yayın sayıları. */
  unlinked: { youtube: number; instagram: number };
  /** Uygulanan (normalize edilmiş) sorgu — UI bunu geri yansıtır. */
  query: ContentImpactQuery;
}

/** Türkçe duyarsız arama için normalize. */
export function normalizeSearch(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/i̇/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c')
    .replace(/ö/g, 'o').replace(/ü/g, 'u')
    .trim();
}

/**
 * Dışarıdan gelen (client / server action) sorguyu güvenli hale getir.
 * Sayfa ve sayfa boyutu sınırlanır — client sonsuz sayfa boyutu isteyemez.
 */
export function normalizeQuery(input: Partial<ContentImpactQuery> | undefined): ContentImpactQuery {
  const q = { ...DEFAULT_IMPACT_QUERY, ...(input ?? {}) };
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(q.pageSize) || DEFAULT_PAGE_SIZE));
  return {
    ...q,
    search: (q.search ?? '').trim(),
    platforms: [...new Set(q.platforms ?? [])],
    page: Math.max(1, Math.trunc(q.page) || 1),
    pageSize,
  };
}

/** Bir içerik sorguya uyuyor mu — saf, test edilebilir. */
export function matchesQuery(impact: ContentImpact, q: ContentImpactQuery): boolean {
  if (q.search) {
    const needle = normalizeSearch(q.search);
    const hay = `${normalizeSearch(impact.title)} ${impact.code.toLowerCase()}`;
    if (!hay.includes(needle)) return false;
  }

  if (q.from || q.to) {
    // Tarihi bilinmeyen içerik bir tarih aralığına giremez.
    if (!impact.firstPublishedAt) return false;
    const day = impact.firstPublishedAt.slice(0, 10);
    if (q.from && day < q.from) return false;
    if (q.to && day > q.to) return false;
  }

  if (q.contentType !== ALL && impact.contentType !== q.contentType) return false;

  if (q.platforms.length > 0) {
    const on = new Set(impact.publications.map((p) => p.platform));
    if (!q.platforms.every((p) => on.has(p))) return false;
  }

  const count = impact.publications.length;
  if (q.reach === 'SINGLE' && count !== 1) return false;
  if (q.reach === 'MULTI' && count < 2) return false;

  if (q.status !== ALL && impact.verdict.status !== q.status) return false;

  if (q.library === 'IN_LIBRARY' && !impact.inLibrary) return false;
  if (q.library === 'NOT_IN_LIBRARY' && impact.inLibrary) return false;

  return true;
}

/** "En güçlü genel durum" sıralamasının sırası. */
export const STATUS_RANK: Record<OverallStatus, number> = {
  COK_GUCLU: 5,
  GUCLU: 4,
  ORTA: 3,
  ZAYIF: 2,
  VERI_YETERSIZ: 1,
};

function ts(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

/**
 * Sıralama karşılaştırıcısı. Eşitlikte her zaman tarihe, sonra id'ye düşer —
 * sayfalama sırasında satırların yer değiştirmemesi için sıra deterministik
 * olmak ZORUNDA.
 */
export function compareImpacts(a: ContentImpact, b: ContentImpact, sort: ContentImpactSort): number {
  let d = 0;
  switch (sort) {
    case 'OLDEST':
      d = ts(a.firstPublishedAt) - ts(b.firstPublishedAt);
      break;
    case 'EXPOSURE':
      // Verisi olmayan içerik "0 erişim"le aynı yere düşmemeli → -1 ile en sona.
      d = (b.totals.exposure.value ?? -1) - (a.totals.exposure.value ?? -1);
      break;
    case 'ENGAGEMENT':
      d = (b.totals.engagements.value ?? -1) - (a.totals.engagements.value ?? -1);
      break;
    case 'STATUS':
      d = STATUS_RANK[b.verdict.status] - STATUS_RANK[a.verdict.status];
      break;
    case 'PLATFORMS':
      d = b.publications.length - a.publications.length;
      break;
    case 'NEWEST':
    default:
      d = ts(b.firstPublishedAt) - ts(a.firstPublishedAt);
  }
  if (d !== 0) return d;
  const byDate = ts(b.firstPublishedAt) - ts(a.firstPublishedAt);
  return byDate !== 0 ? byDate : a.cardId.localeCompare(b.cardId);
}

/** Filtre seçeneklerinin sayıları — filtresiz korpustan. */
export function buildFacets(impacts: ContentImpact[]): ContentImpactFacets {
  const platforms = new Map<ContentPlatform, number>();
  const statuses = new Map<OverallStatus, number>();
  const types = new Map<string, number>();

  for (const i of impacts) {
    for (const p of new Set(i.publications.map((x) => x.platform))) {
      platforms.set(p, (platforms.get(p) ?? 0) + 1);
    }
    statuses.set(i.verdict.status, (statuses.get(i.verdict.status) ?? 0) + 1);
    if (i.contentType) types.set(i.contentType, (types.get(i.contentType) ?? 0) + 1);
  }

  return {
    platforms: [...platforms.entries()].map(([platform, count]) => ({ platform, count })),
    statuses: OVERALL_STATUSES.filter((s) => statuses.has(s)).map((s) => ({ status: s, count: statuses.get(s) as number })),
    contentTypes: [...types.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, 'tr')),
  };
}

/**
 * Bir yayının skorunu belirle: önce mevcut platform skoru, sonra kontrollü
 * fallback'ler. Hiçbiri yoksa skor null ve etiket COLLECTING kalır.
 */
export function resolveScore(
  metrics: PlatformMetrics,
  platformScore: number | null,
  benchmark: PlatformBenchmark | undefined,
  ownEngagementRate: number | null
): { score: number | null; basis: ScoreBasis; label: PerfLabel } {
  // 1. Mevcut platform performans skoru (tür içi oran)
  if (platformScore != null) {
    return { score: platformScore, basis: 'PLATFORM_SCORE', label: scoreToLabel(platformScore) };
  }

  const usable = benchmark && benchmark.sampleSize >= MIN_SAMPLE_FOR_FALLBACK ? benchmark : undefined;

  // 2. Platform içi normalize edilmiş erişim oranı
  if (usable?.avgExposure && metrics.exposure != null) {
    const score = metrics.exposure / usable.avgExposure;
    return { score, basis: 'PLATFORM_RATIO', label: scoreToLabel(score) };
  }

  // 3. Etkileşim oranı
  if (usable?.avgEngagementRate && ownEngagementRate != null) {
    const score = ownEngagementRate / usable.avgEngagementRate;
    return { score, basis: 'ENGAGEMENT_RATE', label: scoreToLabel(score) };
  }

  // 4. Veri yetersiz
  return { score: null, basis: 'NONE', label: 'COLLECTING' };
}
