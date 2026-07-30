/**
 * Instagram media insights — medya türüne göre yetenek haritası.
 *
 * Meta bir metriği medya türüne, hesap türüne, izinlere ve Graph API sürümüne
 * göre desteklemeyebilir. Bu yüzden TEK sabit metrik listesiyle her medyayı
 * sorgulamak yanlıştır: bir metrik reddedilince bütün istek düşer ve o içeriğin
 * hiçbir verisi gelmez.
 *
 * Yaklaşım:
 *   1. Medya türü için dokümante edilmiş metrik setiyle dene.
 *   2. Reddedilirse metrikleri TEK TEK yokla ve gerçek destek setini keşfet.
 *   3. Keşfi medya türü bazında önbelleğe al — aynı sync içinde tekrar yoklama
 *      yapılmaz (Instagram rate limit'i serttir).
 *
 * Desteklenmeyen metrik `null` kalır; 0 YAZILMAZ. "Veri yok" ile
 * "API desteklemiyor" ayrımı availability haritasında taşınır.
 *
 * Beğeni ve yorum BİLEREK burada istenmez — onlar medya nesnesinden gelir,
 * insights'tan da alınırsa aynı sayı iki kez toplanır.
 */

import type { MetricAvailability } from '@/app/(dashboard)/icerik-performansi/publication-snapshot.constants';

const GRAPH = 'https://graph.instagram.com';
/** raw_metadata'ya yazılır — API sürümü değişince fark görülebilsin. */
export const IG_GRAPH_HOST = GRAPH;

/** instagram_media.content_type → Meta medya ürün türü. */
export type IgMediaKind = 'REELS' | 'FEED' | 'CAROUSEL_ALBUM' | 'STORY';

export function toMediaKind(contentType: string | null | undefined): IgMediaKind {
  switch (contentType) {
    case 'reels': return 'REELS';
    case 'carousel': return 'CAROUSEL_ALBUM';
    case 'story': return 'STORY';
    default: return 'FEED';
  }
}

/**
 * Medya türüne göre DOKÜMANTE EDİLMİŞ insight metrikleri.
 * Buraya yalnızca Meta dokümantasyonunda geçen adlar yazılır — tahmin yok.
 */
export const INSTAGRAM_INSIGHT_CAPABILITIES: Record<IgMediaKind, string[]> = {
  REELS: [
    'views', 'reach', 'saved', 'shares', 'total_interactions', 'follows',
    'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time',
  ],
  FEED: ['views', 'reach', 'saved', 'shares', 'total_interactions', 'follows', 'profile_visits'],
  CAROUSEL_ALBUM: ['views', 'reach', 'saved', 'shares', 'total_interactions', 'follows'],
  STORY: ['views', 'reach', 'replies', 'total_interactions'],
};

export interface InsightFetchResult {
  /** Metrik adı → değer. Yalnızca gerçekten dönenler. */
  values: Record<string, number>;
  requestedMetrics: string[];
  returnedMetrics: string[];
  unsupportedMetrics: string[];
  permissionMissingMetrics: string[];
  failedMetrics: string[];
  /** Metrik başına durum — snapshot'a yazılır. */
  availability: Record<string, MetricAvailability>;
  /** Medyanın tamamı alınamadıysa (token/ağ) — metrik seviyesinde değil. */
  error?: string;
}

interface MetaError {
  message?: string;
  code?: number;
  error_subcode?: number;
  type?: string;
}

function classifyError(err: MetaError | undefined): 'PERMISSION_MISSING' | 'UNSUPPORTED' | 'FAILED' {
  const msg = (err?.message ?? '').toLowerCase();
  if (err?.code === 10 || err?.code === 200 || msg.includes('permission')) return 'PERMISSION_MISSING';
  if (
    msg.includes('does not support') ||
    msg.includes('not available') ||
    msg.includes('must be one of') ||
    msg.includes('should not be queried') ||
    msg.includes('unsupported') ||
    msg.includes('invalid parameter')
  ) {
    return 'UNSUPPORTED';
  }
  return 'FAILED';
}

async function requestInsights(
  mediaId: string,
  metrics: string[],
  token: string
): Promise<{ ok: boolean; values: Record<string, number>; error?: MetaError }> {
  const url = `${GRAPH}/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${token}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || json.error) return { ok: false, values: {}, error: json.error as MetaError };

    const values: Record<string, number> = {};
    for (const entry of (json.data ?? []) as { name?: string; values?: { value?: unknown }[]; total_value?: { value?: unknown } }[]) {
      if (!entry.name) continue;
      // metric_type'a göre değer values[0].value ya da total_value.value'da olur.
      const raw = entry.values?.[0]?.value ?? entry.total_value?.value;
      const n = Number(raw);
      // Gerçek 0 korunur; parse edilemeyen değer atlanır (null kalır).
      if (raw != null && Number.isFinite(n)) values[entry.name] = n;
    }
    return { ok: true, values };
  } catch (e) {
    return { ok: false, values: {}, error: { message: e instanceof Error ? e.message : 'ağ hatası' } };
  }
}

/**
 * Medya türü bazında keşfedilmiş destek seti. Aynı sync çalışması boyunca
 * tekrar yoklama yapılmaması için servis örneğinde tutulur.
 */
export type CapabilityCache = Map<IgMediaKind, { supported: string[]; unsupported: string[]; permissionMissing: string[] }>;

export function createCapabilityCache(): CapabilityCache {
  return new Map();
}

export const instagramInsightsService = {
  /**
   * Bir medyanın insight'larını çek. Desteklenmeyen metrik bütün medyayı
   * düşürmez — set daraltılıp tekrar denenir.
   */
  async fetchForMedia(
    mediaId: string,
    kind: IgMediaKind,
    token: string,
    cache: CapabilityCache = createCapabilityCache()
  ): Promise<InsightFetchResult> {
    const requested = INSTAGRAM_INSIGHT_CAPABILITIES[kind] ?? [];
    const cached = cache.get(kind);
    const attempt = cached?.supported ?? requested;

    const result: InsightFetchResult = {
      values: {},
      requestedMetrics: requested,
      returnedMetrics: [],
      unsupportedMetrics: cached?.unsupported ?? [],
      permissionMissingMetrics: cached?.permissionMissing ?? [],
      failedMetrics: [],
      availability: {},
    };
    if (attempt.length === 0) {
      for (const m of requested) result.availability[m] = 'UNSUPPORTED';
      return result;
    }

    const first = await requestInsights(mediaId, attempt, token);
    if (first.ok) {
      result.values = first.values;
      result.returnedMetrics = Object.keys(first.values);
      // Set kabul edildi ama bir metrik hiç dönmediyse o metrik bu medya için yok.
      for (const m of attempt) {
        result.availability[m] = m in first.values ? 'OK' : 'UNSUPPORTED';
      }
      for (const m of result.unsupportedMetrics) result.availability[m] = 'UNSUPPORTED';
      for (const m of result.permissionMissingMetrics) result.availability[m] = 'PERMISSION_MISSING';
      return result;
    }

    // Toplu istek reddedildi. Metrikleri tek tek yoklayıp gerçek seti keşfet.
    // Bu yoklama medya TÜRÜ başına bir kez yapılır ve önbelleğe alınır.
    const supported: string[] = [];
    const unsupported: string[] = [];
    const permissionMissing: string[] = [];
    const failed: string[] = [];

    for (const metric of attempt) {
      const probe = await requestInsights(mediaId, [metric], token);
      if (probe.ok) {
        supported.push(metric);
        Object.assign(result.values, probe.values);
        result.availability[metric] = metric in probe.values ? 'OK' : 'UNSUPPORTED';
        continue;
      }
      const kindOfError = classifyError(probe.error);
      if (kindOfError === 'PERMISSION_MISSING') permissionMissing.push(metric);
      else if (kindOfError === 'UNSUPPORTED') unsupported.push(metric);
      else failed.push(metric);
      result.availability[metric] = kindOfError;
    }

    cache.set(kind, { supported, unsupported, permissionMissing });

    result.returnedMetrics = Object.keys(result.values);
    result.unsupportedMetrics = unsupported;
    result.permissionMissingMetrics = permissionMissing;
    result.failedMetrics = failed;
    // Hiçbir metrik alınamadıysa bunu medya seviyesinde hata olarak da bildir.
    if (result.returnedMetrics.length === 0) {
      result.error = first.error?.message ?? 'insight alınamadı';
    }
    return result;
  },
};
