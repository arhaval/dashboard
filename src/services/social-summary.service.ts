/**
 * Aylık sosyal medya özeti — veriyi toplar, yorumu saf katmana bıraktırır.
 *
 * Bu servis HİÇBİR karar vermez: KPI'ları buildKpis, platform tablosunu
 * buildPlatformRows, içgörüleri buildInsights, doluluk haritasını
 * monthCompleteness üretir (hepsi saf ve test edilebilir). Burada yalnızca
 * "hangi tabloyu okuyorum" bilgisi var.
 */

import { createClient } from '@/lib/supabase/server';
import { videoPerformanceService } from './video-performance.service';
import { VIDEO_GENRE_LABELS } from '@/app/(dashboard)/icerik-performansi/perf.constants';
import {
  monthCompleteness,
  previousMonth,
  MONTHLY_PLATFORMS,
  type MonthCompleteness,
  type MonthlyPlatform,
} from '@/app/(dashboard)/social/social-monthly.constants';
import {
  buildInsights,
  buildKpis,
  buildPlatformRows,
  type Insight,
  type Kpi,
  type PlatformRow,
} from '@/app/(dashboard)/social/social-overview.constants';

type MetricRow = { platform: string; [column: string]: unknown };

/** İçerik türü ortalaması — "en güçlü tür" içgörüsünün kaynağı. */
interface GenreStat {
  label: string;
  count: number;
  avgViews: number;
}

export interface MonthlyOverview {
  /** Genel Bakış'ın 4 kartı. */
  kpis: Kpi[];
  /** Tek platform tablosu. */
  platformRows: PlatformRow[];
  /** "Bu Ay Ne Oldu?" — en fazla 4 satır. */
  insights: Insight[];
  completeness: MonthCompleteness;
}

export const socialSummaryService = {
  /** Bir ayın satırları. `select('*')` — yeni kolonlar migration'dan önce yoksa patlamasın. */
  async getRows(month: string): Promise<MetricRow[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('social_monthly_metrics').select('*').eq('month', month);
    return (data ?? []) as MetricRow[];
  },

  /**
   * Tür ortalamaları — mevcut skorlama servisinden türetilir, yeniden
   * hesaplanmaz. "Hangi tür tutuyor" sorusunun kaynağı budur.
   */
  async getGenreStats(): Promise<GenreStat[]> {
    const videos = await videoPerformanceService.getAllScored();
    const acc = new Map<string, { count: number; sum: number }>();
    for (const v of videos) {
      const views = Number(v.view_count);
      if (!Number.isFinite(views) || views <= 0) continue;
      const label = VIDEO_GENRE_LABELS[v.effective_genre];
      const cur = acc.get(label) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += views;
      acc.set(label, cur);
    }
    return [...acc].map(([label, { count, sum }]) => ({
      label,
      count,
      avgViews: Math.round(sum / count),
    }));
  },

  /** Bir ayın Genel Bakış verisi + doluluk haritası. */
  async getOverview(
    month: string,
    tracked: MonthlyPlatform[] = MONTHLY_PLATFORMS
  ): Promise<MonthlyOverview> {
    const [rows, previousRows, genres] = await Promise.all([
      this.getRows(month),
      this.getRows(previousMonth(month)),
      this.getGenreStats(),
    ]);

    const completeness = monthCompleteness(month, rows, tracked);
    const platformRows = buildPlatformRows(rows, previousRows, tracked);
    const topGenre = [...genres].sort((a, b) => b.avgViews - a.avgViews)[0] ?? null;

    return {
      kpis: buildKpis(rows, previousRows, tracked),
      platformRows,
      insights: buildInsights({
        platforms: platformRows,
        topGenre: topGenre ? { label: topGenre.label, avgViews: topGenre.avgViews } : null,
        missingPlatforms: completeness.platforms.filter((p) => p.missing).map((p) => p.label),
      }),
      completeness,
    };
  },
};
