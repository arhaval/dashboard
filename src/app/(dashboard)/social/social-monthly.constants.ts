/**
 * Aylık sosyal medya girişi — alan kataloğu ve doluluk hesabı.
 *
 * TEK KAYNAK: hangi platformda hangi alanların girildiği burada tanımlıdır.
 * Form da (metrics-form) doluluk hesabı da buradan okur — form kendi listesini
 * tutsaydı, yeni bir alan eklendiğinde "eksik giriş" uyarısı onu görmezdi.
 *
 * NO server imports (client component'lar import ediyor).
 */

import { tr } from '@/lib/i18n';
import type { MetricsPlatform } from '@/types';

/**
 * Aylık veri girilen platformlar. Tip tek yerde (`MetricsPlatform`) tanımlı —
 * ayrı bir birleşim yazmak, yeni platform eklendiğinde ikisinin ayrışmasına
 * yol açardı.
 */
export type MonthlyPlatform = MetricsPlatform;

export const MONTHLY_PLATFORMS: MonthlyPlatform[] = [
  'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'X', 'TWITCH', 'KICK', 'WEBSITE',
];

export const MONTHLY_PLATFORM_LABELS: Record<MonthlyPlatform, string> = {
  TWITCH: 'Twitch',
  KICK: 'Kick',
  YOUTUBE: 'YouTube',
  INSTAGRAM: 'Instagram',
  X: 'X (Twitter)',
  TIKTOK: 'TikTok',
  WEBSITE: 'Web Sitesi',
};

/** Verinin kaynağı: otomatik gelen alan eksikse sorun ENTEGRASYONDADIR. */
export type FieldSource = 'API' | 'MANUAL';

/**
 * Alanın GİRİŞ birimi, depolama biriminden farklı olabilir.
 *
 * Yayın süresi veritabanında DAKİKA tutulur (kolon adı da öyle, mevcut veri de),
 * ama Twitch ve Kick panellerinde SAAT olarak gösteriliyor. Kullanıcının
 * ekranında gördüğü sayıyı elle 60'a bölmesini istemek hata kaynağı.
 */
export type FieldUnit = 'COUNT' | 'HOURS_STORED_AS_MINUTES';

export interface MonthlyField {
  name: string;
  label: string;
  type: 'number' | 'decimal';
  source: FieldSource;
  /** Girişte kullanılan birim. Belirtilmezse ham sayı. */
  unit?: FieldUnit;
  /** CSV'den gelen veri hangi anahtara karşılık gelir. */
  csvKey?: string;
}

/** Kullanıcının girdiği değeri saklanacak değere çevir. */
export function toStoredValue(field: Pick<MonthlyField, 'unit'>, input: number): number {
  return field.unit === 'HOURS_STORED_AS_MINUTES' ? Math.round(input * 60) : Math.round(input);
}

/** Saklanan değeri kullanıcının gördüğü birime çevir. */
export function toInputValue(field: Pick<MonthlyField, 'unit'>, stored: number): number {
  return field.unit === 'HOURS_STORED_AS_MINUTES' ? Math.round((stored / 60) * 10) / 10 : stored;
}

/**
 * Platform başına aylık alanlar.
 *
 * `followers_total` ayrı tutulur (formda da ayrı bir kutu) — web sitesi hariç
 * her platformda var, o yüzden alan listelerinde tekrarlanmaz.
 */
export const MONTHLY_FIELDS: Record<MonthlyPlatform, MonthlyField[]> = {
  TWITCH: [
    { name: 'total_stream_time_minutes', label: 'Toplam Yayın Süresi (saat)', type: 'number', source: 'MANUAL', unit: 'HOURS_STORED_AS_MINUTES', csvKey: 'total_stream_time_minutes' },
    { name: 'avg_viewers',               label: tr.metricsForm.avgViewers,      type: 'number', source: 'MANUAL', csvKey: 'avg_viewers' },
    { name: 'peak_viewers',              label: tr.metricsForm.peakViewers,     type: 'number', source: 'MANUAL', csvKey: 'peak_viewers' },
    { name: 'unique_viewers',            label: tr.metricsForm.uniqueViewers,   type: 'number', source: 'MANUAL' },
    { name: 'live_views',                label: tr.metricsForm.liveViews,       type: 'number', source: 'MANUAL', csvKey: 'live_views' },
    { name: 'unique_chatters',           label: tr.metricsForm.uniqueChatters,  type: 'number', source: 'MANUAL' },
    { name: 'subs_total',                label: tr.metricsForm.subsTotal,       type: 'number', source: 'MANUAL' },
  ],
  KICK: [
    { name: 'followers_total',           label: tr.metricsForm.followersTotal,  type: 'number', source: 'MANUAL' },
    { name: 'peak_viewers',              label: tr.metricsForm.peakViewers,     type: 'number', source: 'MANUAL', csvKey: 'peak_viewers' },
    { name: 'avg_viewers',               label: tr.metricsForm.avgViewers,      type: 'number', source: 'MANUAL', csvKey: 'avg_viewers' },
    { name: 'unique_viewers',            label: tr.metricsForm.uniqueViewers,   type: 'number', source: 'MANUAL' },
    { name: 'live_views',                label: tr.metricsForm.liveViews,       type: 'number', source: 'MANUAL', csvKey: 'live_views' },
    { name: 'total_stream_time_minutes', label: 'Toplam Yayın Süresi (saat)',   type: 'number', source: 'MANUAL', unit: 'HOURS_STORED_AS_MINUTES', csvKey: 'total_stream_time_minutes' },
  ],
  // Abone/izlenme/beğeni/yorum cron ile otomatik dolar; elle sadece canlı
  // izleyici girilir.
  YOUTUBE: [
    { name: 'subscribers_total',  label: tr.metricsForm.subscribersTotal, type: 'number', source: 'API' },
    { name: 'video_views',        label: tr.metricsForm.videoViews,       type: 'number', source: 'API' },
    { name: 'total_likes',        label: tr.metricsForm.totalLikes,       type: 'number', source: 'API' },
    { name: 'total_comments',     label: tr.metricsForm.totalComments,    type: 'number', source: 'API' },
    { name: 'avg_live_viewers',   label: tr.metricsForm.avgLiveViewers,   type: 'number', source: 'MANUAL' },
    { name: 'peak_live_viewers',  label: tr.metricsForm.peakLiveViewers,  type: 'number', source: 'MANUAL' },
  ],
  INSTAGRAM: [
    { name: 'views',    label: tr.metricsForm.views,    type: 'number', source: 'API', csvKey: 'impressions' },
    { name: 'likes',    label: tr.metricsForm.likes,    type: 'number', source: 'API', csvKey: 'likes' },
    { name: 'comments', label: tr.metricsForm.comments, type: 'number', source: 'API', csvKey: 'comments' },
    { name: 'saves',    label: tr.metricsForm.saves,    type: 'number', source: 'API', csvKey: 'saves' },
    { name: 'shares',   label: tr.metricsForm.shares,   type: 'number', source: 'API', csvKey: 'shares' },
  ],
  // TikTok'un entegrasyonu yok; mevcut genel kolonlar elle doldurulur.
  TIKTOK: [
    { name: 'views',    label: tr.metricsForm.views,    type: 'number', source: 'MANUAL' },
    { name: 'likes',    label: tr.metricsForm.likes,    type: 'number', source: 'MANUAL' },
    { name: 'comments', label: tr.metricsForm.comments, type: 'number', source: 'MANUAL' },
    { name: 'saves',    label: tr.metricsForm.saves,    type: 'number', source: 'MANUAL' },
    { name: 'shares',   label: tr.metricsForm.shares,   type: 'number', source: 'MANUAL' },
  ],
  X: [
    { name: 'impressions',    label: tr.metricsForm.impressions,   type: 'number', source: 'MANUAL', csvKey: 'impressions' },
    { name: 'likes',          label: tr.metricsForm.likes,         type: 'number', source: 'MANUAL', csvKey: 'likes' },
    { name: 'replies',        label: tr.metricsForm.replies,       type: 'number', source: 'MANUAL', csvKey: 'replies' },
    { name: 'shares',         label: tr.metricsForm.retweets,      type: 'number', source: 'MANUAL', csvKey: 'retweets' },
    { name: 'profile_visits', label: tr.metricsForm.profileVisits, type: 'number', source: 'MANUAL', csvKey: 'profile_visits' },
  ],
  // Web sitesinin takipçisi yok; ölçüsü ziyaret ve okunma.
  WEBSITE: [
    { name: 'visitors',            label: 'Tekil Ziyaretçi',            type: 'number', source: 'MANUAL' },
    { name: 'page_views',          label: 'Sayfa Görüntüleme',          type: 'number', source: 'MANUAL' },
    { name: 'avg_session_seconds', label: 'Ort. Oturum Süresi (saniye)', type: 'number', source: 'MANUAL' },
  ],
};

/** Takipçi alanı olmayan platformlar — doluluk hesabında aranmaz. */
export const PLATFORMS_WITHOUT_FOLLOWERS: MonthlyPlatform[] = ['WEBSITE'];

/**
 * Platformun TAKİPÇİ alanı. YouTube aboneyi ayrı kolonda tutar; web sitesinin
 * takipçisi yoktur. KPI toplamı ve platform tablosu bu eşlemeyi kullanır —
 * yoksa YouTube toplamda hep 0 görünürdü.
 */
export const FOLLOWER_FIELD: Record<MonthlyPlatform, string | null> = {
  TWITCH: 'followers_total',
  KICK: 'followers_total',
  YOUTUBE: 'subscribers_total',
  INSTAGRAM: 'followers_total',
  X: 'followers_total',
  TIKTOK: 'followers_total',
  WEBSITE: null,
};

/**
 * Platformun ETKİLEŞİM alanları — toplandığında "toplam etkileşim" verir.
 * Yayın platformlarında (Twitch/Kick) standart bir etkileşim ölçüsü yok;
 * web sitesinde de yok. Boş liste "bu platform etkileşim raporlamıyor" demek,
 * sıfır demek değil.
 */
export const ENGAGEMENT_FIELDS: Record<MonthlyPlatform, string[]> = {
  TWITCH: [],
  KICK: [],
  YOUTUBE: ['total_likes', 'total_comments'],
  INSTAGRAM: ['likes', 'comments', 'saves', 'shares'],
  X: ['likes', 'replies', 'shares'],
  TIKTOK: ['likes', 'comments', 'saves', 'shares'],
  WEBSITE: [],
};

/** Canlı izlenme raporlayan platformlar. */
export const LIVE_VIEW_FIELD: Record<MonthlyPlatform, string | null> = {
  TWITCH: 'live_views',
  KICK: 'live_views',
  YOUTUBE: 'live_views',
  INSTAGRAM: null,
  X: null,
  TIKTOK: null,
  WEBSITE: null,
};

/**
 * Platformun ERİŞİM ölçüsü — "bu ay kaç kişiye ulaştım" sorusunun cevabı.
 * Trend grafiği, aylık özet ve karşılaştırma aynı alanı kullanır ki grafikte
 * gördüğün sayı ile özette okuduğun sayı aynı şeyi anlatsın.
 */
export const MAIN_METRIC: Record<MonthlyPlatform, { key: string; label: string }> = {
  TWITCH:    { key: 'live_views',  label: 'Canlı İzlenme' },
  KICK:      { key: 'live_views',  label: 'Canlı İzlenme' },
  YOUTUBE:   { key: 'video_views', label: 'Video Görüntülenme' },
  INSTAGRAM: { key: 'views',       label: 'Görüntülenme' },
  X:         { key: 'impressions', label: 'Gösterim' },
  TIKTOK:    { key: 'views',       label: 'Görüntülenme' },
  WEBSITE:   { key: 'page_views',  label: 'Sayfa Görüntüleme' },
};

/**
 * Takipçi sayısını kendi listesinde tutan platformlar.
 * YouTube'da bu alan `subscribers_total`; `followers_total` orada bilerek 0
 * bırakılır (form da göndermez), o yüzden onu "eksik" saymak yanlış uyarı olur.
 */
function listsFollowersItself(platform: MonthlyPlatform): boolean {
  return MONTHLY_FIELDS[platform].some(
    (f) => f.name === 'followers_total' || f.name === 'subscribers_total'
  );
}

/**
 * Bir platformun o ay için beklenen bütün alanları (takipçi dahil).
 * Doluluk hesabı ve form aynı listeyi kullanır.
 */
export function expectedFields(platform: MonthlyPlatform): MonthlyField[] {
  const fields = MONTHLY_FIELDS[platform];
  if (PLATFORMS_WITHOUT_FOLLOWERS.includes(platform) || listsFollowersItself(platform)) return fields;
  return [
    { name: 'followers_total', label: tr.metricsForm.followersTotal, type: 'number', source: platform === 'INSTAGRAM' || platform === 'YOUTUBE' ? 'API' : 'MANUAL' },
    ...fields,
  ];
}

// ── Analiz ekranında grafiklenebilir metrikler ──────────────────────────────

/**
 * Türetilmiş metrik: tek kolon değil, ENGAGEMENT_FIELDS toplamı.
 * X'te "Etkileşim" böyle bir metrik (beğeni + yanıt + retweet).
 */
export const DERIVED_ENGAGEMENT = '__engagement__';

export interface AnalyticsMetric {
  key: string;
  label: string;
  /**
   * Gösterim çarpanı. Yayın süresi dakika saklanır ama saat olarak okunur;
   * grafik ve tablo aynı readMetric'ten geçtiği için ikisi de tutarlı olur.
   */
  factor?: number;
}

/**
 * Analiz ekranında çizilebilecek metrikler.
 *
 * Doluluk listesinden (MONTHLY_FIELDS) neden ayrı: o liste "ay kapanması için
 * ZORUNLU olan" alanları tanımlar. Burada ise "grafiği çizilebilen" alanlar var
 * — Shorts izlenme, canlı izlenme gibi zorunlu olmayan ama takip edilen
 * kolonlar da dahil. Etiketler yine tek kaynaktan (tr.metricsForm).
 */
export const ANALYTICS_METRICS: Record<MonthlyPlatform, AnalyticsMetric[]> = {
  INSTAGRAM: [
    { key: 'followers_total', label: tr.metricsForm.followersTotal },
    { key: 'views',           label: tr.metricsForm.views },
    { key: 'likes',           label: tr.metricsForm.likes },
    { key: 'comments',        label: tr.metricsForm.comments },
    { key: 'saves',           label: tr.metricsForm.saves },
    { key: 'shares',          label: tr.metricsForm.shares },
  ],
  YOUTUBE: [
    { key: 'subscribers_total', label: tr.metricsForm.subscribersTotal },
    { key: 'video_views',       label: tr.metricsForm.videoViews },
    { key: 'shorts_views',      label: tr.metricsForm.shortsViews },
    { key: 'live_views',        label: tr.metricsForm.liveViews },
    { key: 'total_likes',       label: tr.metricsForm.totalLikes },
    { key: 'total_comments',    label: tr.metricsForm.totalComments },
  ],
  TIKTOK: [
    { key: 'followers_total', label: tr.metricsForm.followersTotal },
    { key: 'views',           label: tr.metricsForm.views },
    { key: 'likes',           label: tr.metricsForm.likes },
    { key: 'comments',        label: tr.metricsForm.comments },
    { key: 'saves',           label: tr.metricsForm.saves },
    { key: 'shares',          label: tr.metricsForm.shares },
  ],
  X: [
    { key: 'followers_total',    label: tr.metricsForm.followersTotal },
    { key: 'impressions',        label: tr.metricsForm.impressions },
    { key: DERIVED_ENGAGEMENT,   label: 'Etkileşim' },
  ],
  TWITCH: [
    { key: 'followers_total',           label: tr.metricsForm.followersTotal },
    { key: 'live_views',                label: tr.metricsForm.liveViews },
    { key: 'avg_viewers',               label: tr.metricsForm.avgViewers },
    { key: 'peak_viewers',              label: tr.metricsForm.peakViewers },
    { key: 'unique_viewers',            label: tr.metricsForm.uniqueViewers },
    { key: 'unique_chatters',           label: tr.metricsForm.uniqueChatters },
    { key: 'subs_total',                label: tr.metricsForm.subsTotal },
    { key: 'total_stream_time_minutes', label: 'Yayın Süresi (saat)', factor: 1 / 60 },
  ],
  KICK: [
    { key: 'followers_total',           label: tr.metricsForm.followersTotal },
    { key: 'live_views',                label: tr.metricsForm.liveViews },
    { key: 'avg_viewers',               label: tr.metricsForm.avgViewers },
    { key: 'peak_viewers',              label: tr.metricsForm.peakViewers },
    { key: 'unique_viewers',            label: tr.metricsForm.uniqueViewers },
    { key: 'total_stream_time_minutes', label: 'Yayın Süresi (saat)', factor: 1 / 60 },
  ],
  WEBSITE: [
    { key: 'visitors',            label: 'Tekil Ziyaretçi' },
    { key: 'page_views',          label: 'Sayfa Görüntüleme' },
    { key: 'avg_session_seconds', label: 'Ort. Oturum Süresi' },
  ],
};

/** Bir satırdan metrik değerini oku (türetilmiş metrikler dahil). */
export function readMetric(
  row: Record<string, unknown> | undefined,
  platform: MonthlyPlatform,
  metricKey: string
): number | null {
  if (!row) return null;

  const toNum = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  if (metricKey !== DERIVED_ENGAGEMENT) {
    const raw = toNum(row[metricKey]);
    if (raw == null) return null;
    // Gösterim çarpanı (örn. dakika → saat). Grafik ve tablo aynı yerden
    // geçtiği için ikisi de aynı birimi gösterir.
    const factor = ANALYTICS_METRICS[platform].find((m) => m.key === metricKey)?.factor;
    return factor ? Math.round(raw * factor * 10) / 10 : raw;
  }

  let sum = 0;
  let has = false;
  for (const f of ENGAGEMENT_FIELDS[platform]) {
    const v = toNum(row[f]);
    if (v == null) continue;
    sum += v;
    has = true;
  }
  return has ? sum : null;
}

// ── Doluluk ─────────────────────────────────────────────────────────────────

/**
 * Bir alanın DOLU sayılması.
 *
 * `0` burada bilinçli olarak BOŞ sayılır: bu tabloda sayısal kolonlar
 * `NOT NULL DEFAULT 0` ya da nullable olabiliyor, ve gerçekte "o ay 0 izlenme"
 * diye bir durum yok — 0 pratikte "girilmedi" demek. YouTube abone sayısının
 * Temmuz'dan beri 0 yazılması tam olarak böyle görünmez kalmıştı.
 */
export function isFilled(value: unknown): boolean {
  if (value == null || value === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export interface FieldStatus {
  name: string;
  label: string;
  source: FieldSource;
  filled: boolean;
}

export interface PlatformCompleteness {
  platform: MonthlyPlatform;
  label: string;
  fields: FieldStatus[];
  filled: number;
  total: number;
  /** Hiç satırı yok mu — "hiç girilmemiş" ile "eksik girilmiş" farklıdır. */
  missing: boolean;
  /** Eksik alanlardan otomatik gelmesi gerekenler — entegrasyon sorunu. */
  brokenApiFields: string[];
  /** Eksik alanlardan elle girilmesi gerekenler — kullanıcı işi. */
  pendingManualFields: string[];
}

export interface MonthCompleteness {
  month: string;
  platforms: PlatformCompleteness[];
  filled: number;
  total: number;
  /** 0-100 arası tamamlanma yüzdesi (gerçek doluluk — kapatma bunu değiştirmez). */
  percent: number;
  /** Eksiği olan platformlar. */
  incompletePlatforms: MonthlyPlatform[];
  /**
   * Ay kapandı mı — ya bütün alanlar dolu, ya da elle "tamamlandı" işaretlendi.
   * Hatırlatma ve uyarılar buna bakar.
   */
  isComplete: boolean;
  /** Elle kapatıldı mı — "her şey dolu" ile "daha fazlası beklenmiyor" farklı. */
  isManuallyClosed: boolean;
}

/**
 * Bir ayın doluluk haritası.
 *
 * `rows` o aya ait social_monthly_metrics satırlarıdır (platform başına en fazla
 * bir tane). Takip edilecek platformlar `tracked` ile daraltılabilir.
 */
export function monthCompleteness(
  month: string,
  rows: { platform: string; [column: string]: unknown }[],
  tracked: MonthlyPlatform[] = MONTHLY_PLATFORMS,
  /** Ay elle "tamamlandı" işaretlendiyse daha fazla veri istenmez. */
  manuallyClosed = false
): MonthCompleteness {
  const byPlatform = new Map(rows.map((r) => [r.platform, r]));

  const platforms = tracked.map((platform): PlatformCompleteness => {
    const row = byPlatform.get(platform);
    const fields = expectedFields(platform).map((f): FieldStatus => ({
      name: f.name,
      label: f.label,
      source: f.source,
      filled: row ? isFilled(row[f.name]) : false,
    }));

    const unfilled = fields.filter((f) => !f.filled);
    return {
      platform,
      label: MONTHLY_PLATFORM_LABELS[platform],
      fields,
      filled: fields.length - unfilled.length,
      total: fields.length,
      missing: !row,
      brokenApiFields: unfilled.filter((f) => f.source === 'API').map((f) => f.label),
      pendingManualFields: unfilled.filter((f) => f.source === 'MANUAL').map((f) => f.label),
    };
  });

  const filled = platforms.reduce((s, p) => s + p.filled, 0);
  const total = platforms.reduce((s, p) => s + p.total, 0);

  return {
    month,
    platforms,
    filled,
    total,
    // Yüzde GERÇEK doluluğu gösterir; kapatmak veriyi doldurmuş saymaz.
    percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    incompletePlatforms: platforms.filter((p) => p.filled < p.total).map((p) => p.platform),
    isComplete: manuallyClosed || (total > 0 && filled === total),
    isManuallyClosed: manuallyClosed,
  };
}

/** "2026-07" → "Temmuz 2026" */
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return MONTH_NAMES[m - 1] ? `${MONTH_NAMES[m - 1]} ${year}` : month;
}

/** Bir aydan önceki ay ("2026-08" → "2026-07"). */
export function previousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
