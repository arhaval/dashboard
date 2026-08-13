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

export interface MonthlyField {
  name: string;
  label: string;
  type: 'number' | 'decimal';
  source: FieldSource;
  /** CSV'den gelen veri hangi anahtara karşılık gelir. */
  csvKey?: string;
}

/**
 * Platform başına aylık alanlar.
 *
 * `followers_total` ayrı tutulur (formda da ayrı bir kutu) — web sitesi hariç
 * her platformda var, o yüzden alan listelerinde tekrarlanmaz.
 */
export const MONTHLY_FIELDS: Record<MonthlyPlatform, MonthlyField[]> = {
  TWITCH: [
    { name: 'total_stream_time_minutes', label: tr.metricsForm.totalStreamTime, type: 'number', source: 'MANUAL', csvKey: 'total_stream_time_minutes' },
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
    { name: 'live_views',                label: tr.metricsForm.liveViews,       type: 'number', source: 'MANUAL', csvKey: 'live_views' },
    { name: 'total_stream_time_minutes', label: tr.metricsForm.totalStreamTime, type: 'number', source: 'MANUAL', csvKey: 'total_stream_time_minutes' },
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
  /** 0-100 arası tamamlanma yüzdesi. */
  percent: number;
  /** Eksiği olan platformlar. */
  incompletePlatforms: MonthlyPlatform[];
  isComplete: boolean;
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
  tracked: MonthlyPlatform[] = MONTHLY_PLATFORMS
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
    percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    incompletePlatforms: platforms.filter((p) => p.filled < p.total).map((p) => p.platform),
    isComplete: total > 0 && filled === total,
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
