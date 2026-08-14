/**
 * Aylık sosyal medya özeti — veriyi toplar, yorumu saf katmana bıraktırır.
 *
 * Bu servis HİÇBİR karar vermez: cümleleri buildMonthlySummary, doluluk
 * haritasını monthCompleteness üretir (ikisi de saf ve test edilebilir).
 * Burada yalnızca "hangi tabloyu okuyorum" bilgisi var.
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
  buildMonthlySummary,
  type GenreStat,
  type MonthlySummary,
} from '@/app/(dashboard)/social/social-summary.constants';
import {
  buildInsights,
  buildKpis,
  buildPlatformRows,
  type Insight,
  type Kpi,
  type PlatformRow,
} from '@/app/(dashboard)/social/social-overview.constants';

type MetricRow = { platform: string; [column: string]: unknown };

export interface MonthlyOverview {
  /** Genel Bakış'ın 4 kartı. */
  kpis: Kpi[];
  /** Tek platform tablosu. */
  platformRows: PlatformRow[];
  /** "Bu Ay Ne Oldu?" — en fazla 4 satır. */
  insights: Insight[];
  /** Uzun anlatım — Veri Merkezi'nde bağlam olarak kullanılır. */
  summary: MonthlySummary;
  completeness: MonthCompleteness;
}

export const socialSummaryService = {
  /** Bir ayın satırları. `select('*')` — yeni kolonlar migration'dan önce yoksa patlamasın. */
  async getRows(month: string): Promise<MetricRow[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('social_monthly_metrics').select('*').eq('month', month);
    return (data ?? []) as MetricRow[];
  },

  /** O ay yayınlanan içerik sayısı. */
  async countPublished(month: string): Promise<number> {
    const supabase = await createClient();
    // [ayın 1'i, sonraki ayın 1'i) — ay sonu gününü saymaya gerek kalmaz.
    const { count } = await supabase
      .from('content_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'YAYINLANDI')
      .gte('published_date', `${month}-01`)
      .lt('published_date', `${nextMonth(month)}-01`);
    return count ?? 0;
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

  /** Bir ayın tam özeti: cümleler + doluluk haritası. */
  async getOverview(
    month: string,
    tracked: MonthlyPlatform[] = MONTHLY_PLATFORMS
  ): Promise<MonthlyOverview> {
    const prev = previousMonth(month);

    const [rows, previousRows, contentCount, previousContentCount, genres] = await Promise.all([
      this.getRows(month),
      this.getRows(prev),
      this.countPublished(month),
      this.countPublished(prev),
      this.getGenreStats(),
    ]);

    const completeness = monthCompleteness(month, rows, tracked);
    const summary = buildMonthlySummary({
      month,
      rows,
      previousRows,
      contentCount,
      previousContentCount,
      genres,
      completeness,
      tracked,
    });

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
      summary,
      completeness,
    };
  },
};

/** "2026-07" → "2026-08" */
function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
