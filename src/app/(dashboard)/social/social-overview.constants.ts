/**
 * Genel Bakış — KPI toplamları ve kompakt içgörüler.
 *
 * Ekranın görevi: 10 saniyede "ne durumdayız" sorusunu cevaplamak. O yüzden
 * burada uzun metin üretilmez; her içgörü tek satır, bir sayı ve bir yön.
 *
 * Saf ve deterministik — veri okuma servis katmanında.
 *
 * EKSİK VERİ KURALI: bir toplam, veri vermeyen platform yüzünden olduğundan
 * düşük çıkabilir. Bu durumda toplam gizlenmez ama `hasGaps` ile işaretlenir
 * ve yüzde değişim ÜRETİLMEZ — eksik veriyle "%44 düşüş" demek yanıltıcıdır.
 */

import {
  ENGAGEMENT_FIELDS,
  FOLLOWER_FIELD,
  LIVE_VIEW_FIELD,
  MAIN_METRIC,
  MONTHLY_PLATFORM_LABELS,
  type MonthlyPlatform,
} from './social-monthly.constants';

export type Row = { platform: string; [column: string]: unknown };

/** Değeri sayıya çevir; 0 bu tabloda "girilmedi" demek (bkz. isFilled). */
function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sumField(row: Row | undefined, fields: string[]): number | null {
  if (!row || fields.length === 0) return null;
  let sum = 0;
  let has = false;
  for (const f of fields) {
    const v = num(row[f]);
    if (v == null) continue;
    sum += v;
    has = true;
  }
  return has ? sum : null;
}

// ── KPI ─────────────────────────────────────────────────────────────────────

export type KpiKey = 'followers' | 'views' | 'engagement' | 'liveViews';

export const KPI_LABELS: Record<KpiKey, string> = {
  followers: 'Toplam Takipçi',
  views: 'Toplam Görüntülenme',
  engagement: 'Toplam Etkileşim',
  liveViews: 'Canlı İzlenme',
};

export interface Kpi {
  key: KpiKey;
  label: string;
  value: number | null;
  /** Önceki aya göre fark. Kapsam değiştiyse üretilmez. */
  delta: number | null;
  percent: number | null;
  /** Veri vermeyen platform var mı — toplam olduğundan düşük. */
  hasGaps: boolean;
  /** Toplama katkı veren / beklenen platform sayısı. */
  reporting: number;
  expected: number;
}

/** Bir KPI'ın hangi platformlardan hangi alanları topladığı. */
function kpiFields(key: KpiKey, platform: MonthlyPlatform): string[] {
  if (key === 'followers') {
    const f = FOLLOWER_FIELD[platform];
    return f ? [f] : [];
  }
  if (key === 'views') return [MAIN_METRIC[platform].key];
  if (key === 'engagement') return ENGAGEMENT_FIELDS[platform];
  const live = LIVE_VIEW_FIELD[platform];
  return live ? [live] : [];
}

export function buildKpis(
  rows: Row[],
  previousRows: Row[],
  tracked: MonthlyPlatform[]
): Kpi[] {
  const byPlatform = new Map(rows.map((r) => [r.platform, r]));
  const prevByPlatform = new Map(previousRows.map((r) => [r.platform, r]));

  return (Object.keys(KPI_LABELS) as KpiKey[]).map((key): Kpi => {
    // Yalnızca bu KPI'ı raporlayabilen platformlar beklenir.
    const relevant = tracked.filter((p) => kpiFields(key, p).length > 0);

    let value: number | null = null;
    let reporting = 0;
    // Değişim yalnızca İKİ ayda da veri veren platformlardan hesaplanır.
    let comparableNow = 0;
    let comparablePrev = 0;
    let comparable = 0;

    for (const platform of relevant) {
      const fields = kpiFields(key, platform);
      const now = sumField(byPlatform.get(platform), fields);
      const before = sumField(prevByPlatform.get(platform), fields);

      if (now != null) {
        value = (value ?? 0) + now;
        reporting += 1;
      }
      if (now != null && before != null) {
        comparableNow += now;
        comparablePrev += before;
        comparable += 1;
      }
    }

    const hasGaps = reporting < relevant.length;
    // Kıyaslanan platform kümesi bu ayın toplamıyla aynı değilse yüzde
    // yanıltıcı olur (elmayla armut): üretmiyoruz.
    const canCompare = comparable > 0 && comparable === reporting && comparablePrev > 0;
    const delta = canCompare ? comparableNow - comparablePrev : null;
    const percent = canCompare
      ? Math.round(((comparableNow - comparablePrev) / comparablePrev) * 100)
      : null;

    return {
      key,
      label: KPI_LABELS[key],
      value,
      delta,
      percent,
      hasGaps,
      reporting,
      expected: relevant.length,
    };
  });
}

// ── Platform tablosu ────────────────────────────────────────────────────────

export type RowStatus = 'UP' | 'DOWN' | 'FLAT' | 'MISSING';

export interface PlatformRow {
  platform: MonthlyPlatform;
  label: string;
  followers: number | null;
  followersDelta: number | null;
  views: number | null;
  viewsPercent: number | null;
  engagement: number | null;
  status: RowStatus;
}

/** Yükseliş/düşüş eşiği — gürültüyü hareket diye sunmamak için. */
const MOVE_PCT = 5;

export function buildPlatformRows(
  rows: Row[],
  previousRows: Row[],
  tracked: MonthlyPlatform[]
): PlatformRow[] {
  const byPlatform = new Map(rows.map((r) => [r.platform, r]));
  const prevByPlatform = new Map(previousRows.map((r) => [r.platform, r]));

  return tracked.map((platform): PlatformRow => {
    const row = byPlatform.get(platform);
    const prev = prevByPlatform.get(platform);

    const followerField = FOLLOWER_FIELD[platform];
    const followers = followerField ? num(row?.[followerField]) : null;
    const followersBefore = followerField ? num(prev?.[followerField]) : null;

    const views = num(row?.[MAIN_METRIC[platform].key]);
    const viewsBefore = num(prev?.[MAIN_METRIC[platform].key]);
    const engagement = sumField(row, ENGAGEMENT_FIELDS[platform]);

    const viewsPercent =
      views != null && viewsBefore != null && viewsBefore > 0
        ? Math.round(((views - viewsBefore) / viewsBefore) * 100)
        : null;

    let status: RowStatus = 'FLAT';
    if (!row || (followers == null && views == null)) status = 'MISSING';
    else if (viewsPercent != null) {
      if (viewsPercent >= MOVE_PCT) status = 'UP';
      else if (viewsPercent <= -MOVE_PCT) status = 'DOWN';
    } else if (followers != null && followersBefore != null) {
      status = followers > followersBefore ? 'UP' : followers < followersBefore ? 'DOWN' : 'FLAT';
    }

    return {
      platform,
      label: MONTHLY_PLATFORM_LABELS[platform],
      followers,
      followersDelta: followers != null && followersBefore != null ? followers - followersBefore : null,
      views,
      viewsPercent,
      engagement,
      status,
    };
  });
}

// ── İçgörüler ───────────────────────────────────────────────────────────────

export type InsightTone = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface Insight {
  /** "En hızlı büyüyen" */
  title: string;
  /** "Kick" */
  subject: string;
  /** "+659 takipçi · %148" */
  detail: string;
  tone: InsightTone;
}

export interface InsightInput {
  platforms: PlatformRow[];
  /** En güçlü içerik türü (YouTube tür ortalamalarından). */
  topGenre?: { label: string; avgViews: number } | null;
  /** Hiç veri girilmemiş platformlar. */
  missingPlatforms: string[];
}

/** En fazla 4 içgörü — ekran uzamasın, karar netleşsin. */
const MAX_INSIGHTS = 4;

export function buildInsights({ platforms, topGenre, missingPlatforms }: InsightInput): Insight[] {
  const insights: Insight[] = [];

  const moved = platforms.filter((p) => p.viewsPercent != null);
  const risers = [...moved].sort((a, b) => (b.viewsPercent ?? 0) - (a.viewsPercent ?? 0));
  const fallers = [...moved].sort((a, b) => (a.viewsPercent ?? 0) - (b.viewsPercent ?? 0));

  const best = risers[0];
  if (best && (best.viewsPercent ?? 0) >= MOVE_PCT) {
    const followerPart = best.followersDelta != null && best.followersDelta > 0
      ? `+${best.followersDelta.toLocaleString('tr-TR')} takipçi · `
      : '';
    insights.push({
      title: 'En hızlı büyüyen',
      subject: best.label,
      detail: `${followerPart}%${best.viewsPercent}`,
      tone: 'POSITIVE',
    });
  }

  const worst = fallers[0];
  if (worst && (worst.viewsPercent ?? 0) <= -MOVE_PCT && worst.platform !== best?.platform) {
    insights.push({
      title: 'En büyük düşüş',
      subject: worst.label,
      detail: `Görüntülenme %${Math.abs(worst.viewsPercent ?? 0)}`,
      tone: 'NEGATIVE',
    });
  }

  if (topGenre) {
    insights.push({
      title: 'En güçlü içerik türü',
      subject: topGenre.label,
      detail: `Ort. ${compact(topGenre.avgViews)} görüntülenme`,
      tone: 'POSITIVE',
    });
  }

  if (missingPlatforms.length > 0 && insights.length < MAX_INSIGHTS) {
    insights.push({
      title: 'Dikkat',
      subject: `${missingPlatforms.length} platformun verisi yok`,
      detail: missingPlatforms.join(', '),
      tone: 'NEUTRAL',
    });
  }

  return insights.slice(0, MAX_INSIGHTS);
}

/**
 * Kısa sayı: 10482 → "10,5K", 2365698 → "2,4M".
 *
 * K/M kullanılıyor ("B" değil): panelin geri kalanı ve büyüme raporu da böyle,
 * iki farklı kısaltma aynı ekranda okumayı zorlaştırıyordu.
 */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString('tr-TR');
}

/**
 * Tam sayı: 60973 → "60.973".
 *
 * Takipçi gibi "kaç kişi" sayılarında kısaltma bilgi kaybettirir — 10,4K ile
 * 10,449 arasındaki fark hedef takibinde önemlidir.
 */
export function full(n: number): string {
  return n.toLocaleString('tr-TR');
}
