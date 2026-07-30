/**
 * PLATFORM METRİK ADAPTER — tek kaynak.
 *
 * Platformlar aynı kavramı farklı isimle raporlar (repost = paylaşım,
 * bookmark = kaydetme, abone = takipçi). Bu eşleme YALNIZCA burada yapılır;
 * servis ve UI ortak `PlatformMetrics` kavramlarıyla çalışır.
 *
 * İki kural bu dosyanın varlık sebebi:
 *
 *   1. GÖSTERİM ≠ İZLENME. X'te impressions bir video izlenmesi değildir;
 *      yalnızca `exposure`a girer, `views`a ASLA girmez. Aksi halde sistem
 *      yüksek ama yanıltıcı bir "toplam izlenme" üretir.
 *   2. EKSİK VERİ ≠ SIFIR. Platform o metriği vermiyorsa null döner; 0 yalnızca
 *      platform gerçekten "sıfır" dediğinde yazılır.
 *
 * Saf modül: server importu yok, yan etkisi yok, aynı girdi → aynı çıktı.
 */

import { EMPTY_METRICS, type PlatformMetrics } from './content-impact.constants';
import type { ScoredVideo } from './perf.constants';
import type { ScoredMedia } from './ig-perf.constants';
import type { ContentPlatform } from '../icerik-plani/content-queue.constants';

/** Elle girilen platformların ham satırı (content_publications). */
export interface ManualMetricRow {
  views?: number | string | null;
  /** X: gösterim. İzlenme DEĞİLDİR. */
  impressions?: number | string | null;
  likes?: number | string | null;
  /** Yorum / yanıt (X: replies). */
  comments?: number | string | null;
  /** Paylaşım / repost. */
  shares?: number | string | null;
  /** Kaydetme / bookmark. */
  saves?: number | string | null;
  /** Kazanılan takipçi / abone. */
  followers_gained?: number | string | null;
}

/**
 * BIGINT alanları güvenle sayıya çevir. Yok / boş / sayı değilse null — 0 DEĞİL.
 * Supabase bigint'i string döndürebilir, o yüzden string de kabul edilir.
 */
export function toNumber(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parse edilemeyen değerlerin sessizce kaybolmaması için hata toplayıcı. */
export interface ParseIssue {
  metric: string;
  source: string;
  raw: unknown;
}

/**
 * API değerini sayıya çevir. `undefined`/`null` sessizce null döner (metrik
 * gelmemiş), AMA dolu bir değer parse EDİLEMİYORSA bu bir hatadır: 0 yazılmaz,
 * null döner ve `issues` listesine yazılır ki sync log'unda görünsün.
 */
export function parseMetric(
  raw: unknown,
  metric: string,
  source: string,
  issues?: ParseIssue[]
): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    issues?.push({ metric, source, raw });
    return null;
  }
  return n;
}

// ── Birim dönüşümleri ────────────────────────────────────────────────────────
//
// Süre birimleri TEK BİR YERDE çevrilir. Ortak modeldeki her süre SANİYEdir.
// Çift dönüşüm (aynı değeri iki kez bölmek) en kolay yapılan hatadır; bu yüzden
// dönüşüm yalnızca ham API değerini alan bu fonksiyonlarda yapılır, aşağı
// katmanlarda ASLA tekrar edilmez.

/** YouTube Analytics `estimatedMinutesWatched` → saniye. */
export function minutesToSeconds(minutes: number | null): number | null {
  return minutes == null ? null : minutes * 60;
}

/**
 * Meta'nın Reels süre metrikleri (`ig_reels_avg_watch_time`,
 * `ig_reels_video_view_total_time`) MİLİSANİYE cinsindendir → saniye.
 *
 * Ham değer ve varsayılan birim snapshot'ın raw_metadata'sına yazılır; API
 * birim değiştirirse fark oradan görülebilir. Değer tahmin edilmez.
 */
export const IG_WATCH_TIME_UNIT = 'milliseconds' as const;

export function millisecondsToSeconds(ms: number | null): number | null {
  return ms == null ? null : ms / 1000;
}

/**
 * TOPLAM süreler tam saniyeye yuvarlanır.
 *
 * Milisaniyeden çevirince kesirli değer çıkıyor (660732031ms → 660732,031sn)
 * ama toplam süre kolonu tam sayı; kesirli değer bütün kaydı düşürür. Toplam
 * izlenme süresinde saniyenin binde biri zaten anlamsız bir hassasiyet.
 * ORTALAMA süre yuvarlanmaz — orada ondalık gerçekten bilgi taşır.
 */
export function toWholeSeconds(seconds: number | null): number | null {
  return seconds == null ? null : Math.round(seconds);
}

/**
 * Bir platformun `exposure` (erişim) değeri hangi alandan gelir.
 *
 * X gösterim üzerinden dağıtır, video platformları izlenme üzerinden. Gösterimi
 * olan bir X gönderisinde izlenme alanı boş kalabilir; bu durumda erişim
 * gösterimden okunur ama izlenme null kalır.
 */
export function resolveExposure(
  platform: ContentPlatform,
  { views, impressions }: { views: number | null; impressions: number | null }
): number | null {
  if (platform === 'X') return impressions ?? views;
  // Video platformlarında gösterim alanı doldurulmuşsa yalnızca izlenme yoksa
  // yedek olarak kullanılır — izlenme her zaman daha güvenilir ölçüdür.
  return views ?? impressions;
}

/**
 * Elle girilen platformlar (TikTok / X / Twitch).
 * `views` yalnızca gerçek izlenmeyi taşır: X'in gösterimi buraya YAZILMAZ.
 */
export function mapManualMetrics(platform: ContentPlatform, row: ManualMetricRow): PlatformMetrics {
  const views = toNumber(row.views);
  const impressions = toNumber(row.impressions);
  return {
    ...EMPTY_METRICS,
    exposure: resolveExposure(platform, { views, impressions }),
    views,
    impressions,
    likes: toNumber(row.likes),
    comments: toNumber(row.comments),
    shares: toNumber(row.shares),
    saves: toNumber(row.saves),
    followersGained: toNumber(row.followers_gained),
  };
}

/**
 * YouTube — mevcut senkronizasyon izlenme / beğeni / yorum getirir.
 * Paylaşım, kaydetme ve abone kazanımı bu entegrasyonda YOK → null kalır,
 * sahte 0 yazılmaz (yoksa "hiç paylaşılmamış" gibi okunur).
 */
export function mapYoutubeMetrics(video: Pick<ScoredVideo, 'view_count' | 'like_count' | 'comment_count'>): PlatformMetrics {
  const views = toNumber(video.view_count);
  return {
    ...EMPTY_METRICS,
    exposure: views,
    views,
    likes: toNumber(video.like_count),
    comments: toNumber(video.comment_count),
  };
}

/**
 * Instagram — beğeni/yorum her medya için gelir, izlenme gelmeyebilir.
 *
 * `instagram_media.view_count` NOT NULL DEFAULT 0 olduğu için 0 burada "insight
 * çekilmedi" anlamına gelir, gerçek sıfır değil → null'a çevrilir. Beğeni ve
 * yorumda 0 gerçek sıfırdır, korunur. Reach mevcut senkronizasyonda gelmediği
 * için erişim izlenmeye düşer.
 */
export function mapInstagramMetrics(media: Pick<ScoredMedia, 'view_count' | 'like_count' | 'comment_count'>): PlatformMetrics {
  const raw = toNumber(media.view_count);
  const views = raw != null && raw > 0 ? raw : null;
  return {
    ...EMPTY_METRICS,
    exposure: views,
    views,
    likes: toNumber(media.like_count),
    comments: toNumber(media.comment_count),
  };
}

// ── YouTube Analytics API ────────────────────────────────────────────────────

/** Analytics raporundan gelen ham satır (metrik adı → değer). */
export type YoutubeAnalyticsRow = Partial<Record<
  | 'views'
  | 'engagedViews'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'estimatedMinutesWatched'
  | 'averageViewDuration'
  | 'averageViewPercentage'
  | 'subscribersGained'
  | 'subscribersLost'
  | 'videosAddedToPlaylists'
  | 'videosRemovedFromPlaylists',
  unknown
>>;

/**
 * YouTube Analytics → ortak model.
 *
 * Dikkat edilen üç nokta:
 *  1. `engagedViews` ile `views` AYRI tutulur — Shorts'ta ham izlenme
 *     başlatma/tekrar tabanlı olabilir, ikisi birbirinin yerine geçmez.
 *  2. `videosAddedToPlaylists` KAYDETME DEĞİLDİR; `saves`a yazılmaz,
 *     `playlistAdds` olarak ayrı durur.
 *  3. `subscribersGained` ortak `followersGained` kavramına map edilir —
 *     çapraz platform toplamında abone ve takipçi aynı şeydir.
 */
export function mapYoutubeAnalytics(row: YoutubeAnalyticsRow, issues?: ParseIssue[]): PlatformMetrics {
  const S = 'YOUTUBE_ANALYTICS_API';
  const p = (k: keyof YoutubeAnalyticsRow) => parseMetric(row[k], k, S, issues);

  const views = p('views');
  const adds = p('videosAddedToPlaylists');
  const removals = p('videosRemovedFromPlaylists');

  return {
    ...EMPTY_METRICS,
    exposure: views,
    views,
    engagedViews: p('engagedViews'),
    likes: p('likes'),
    comments: p('comments'),
    shares: p('shares'),
    watchTimeSeconds: toWholeSeconds(minutesToSeconds(p('estimatedMinutesWatched'))),
    // Analytics averageViewDuration zaten SANİYE — tekrar çevrilmez.
    averageViewDurationSeconds: p('averageViewDuration'),
    averageViewPercentage: p('averageViewPercentage'),
    followersGained: p('subscribersGained'),
    followersLost: p('subscribersLost'),
    playlistAdds: adds,
    playlistRemovals: removals,
    netPlaylistAdds: adds == null && removals == null ? null : (adds ?? 0) - (removals ?? 0),
  };
}

// ── Instagram Insights ───────────────────────────────────────────────────────

/** Insights cevabından çıkarılmış metrik adı → değer haritası. */
export type InstagramInsightValues = Record<string, unknown>;

/**
 * Instagram Insights → ortak model.
 *
 * `like_count` / `comments_count` medya nesnesinden gelir; insights aynı değeri
 * farklı isimle sunsa bile BURADA alınmaz — çift toplam oluşurdu.
 */
export function mapInstagramInsights(v: InstagramInsightValues, issues?: ParseIssue[]): PlatformMetrics {
  const S = 'INSTAGRAM_INSIGHTS';
  const p = (k: string) => parseMetric(v[k], k, S, issues);

  const views = p('views');
  const reach = p('reach');

  return {
    ...EMPTY_METRICS,
    // Erişim ölçüsü olarak reach izlenmeden daha doğrudur; yoksa izlenmeye düşer.
    exposure: reach ?? views,
    views,
    reach,
    // Meta sürüme göre `saved` ya da `saved_count` döndürür — ikisi de kabul.
    saves: p('saved') ?? p('saved_count'),
    shares: p('shares') ?? p('shares_count'),
    totalInteractions: p('total_interactions'),
    followersGained: p('follows'),
    watchTimeSeconds: toWholeSeconds(millisecondsToSeconds(p('ig_reels_video_view_total_time'))),
    averageViewDurationSeconds: millisecondsToSeconds(p('ig_reels_avg_watch_time')),
  };
}

/**
 * İki metrik setini birleştir: `patch` içindeki null OLMAYAN değerler `base`
 * üzerine yazılır. Bir kaynağın metriği vermemesi diğerinin verdiğini silmez.
 */
export function overlayMetrics(base: PlatformMetrics, patch: Partial<PlatformMetrics>): PlatformMetrics {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch) as [keyof PlatformMetrics, number | null | undefined][]) {
    if (v != null) out[k] = v;
  }
  return out;
}
