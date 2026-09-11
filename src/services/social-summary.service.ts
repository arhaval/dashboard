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
  topGenreForMonth,
  type Insight,
  type Kpi,
  type PlatformRow,
} from '@/app/(dashboard)/social/social-overview.constants';
import { monthProgress, type MonthProgress } from '@/app/(dashboard)/social/month.utils';

type MetricRow = { platform: string; [column: string]: unknown };

export interface MonthlyOverview {
  /** Genel Bakış'ın 4 kartı. */
  kpis: Kpi[];
  /** Tek platform tablosu. */
  platformRows: PlatformRow[];
  /** "Bu Ay Ne Oldu?" — en fazla 4 satır. */
  insights: Insight[];
  completeness: MonthCompleteness;
  /** Ay sürüyor mu — yarım ayda birikmeli metrikler kıyaslanmaz. */
  progress: MonthProgress;
}

export const socialSummaryService = {
  /** Bir ayın satırları. `select('*')` — yeni kolonlar migration'dan önce yoksa patlamasın. */
  async getRows(month: string): Promise<MetricRow[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('social_monthly_metrics').select('*').eq('month', month);
    return (data ?? []) as MetricRow[];
  },

  /**
   * Ay elle "tamamlandı" işaretlenmiş mi.
   * Tablo migration'dan önce yoksa hata değil, kapatılmamış sayılır.
   */
  async isMonthClosed(month: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('social_month_closures')
      .select('month')
      .eq('month', month)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  },

  /**
   * Seçilen ayda yayınlanan videolardan en güçlü tür. Tüm zamanların ortalaması
   * "bu ay" başlığı altında gösterilmez — her ay aynı cevabı verirdi.
   */
  async getTopGenre(month: string): Promise<{ label: string; avgViews: number } | null> {
    const videos = await videoPerformanceService.getAllScored();
    return topGenreForMonth(
      videos.map((v) => ({
        publishedAt: v.published_at ? String(v.published_at) : null,
        views: Number(v.view_count),
        genreLabel: VIDEO_GENRE_LABELS[v.effective_genre],
      })),
      month
    );
  },

  /** Bir ayın Genel Bakış verisi + doluluk haritası. */
  async getOverview(
    month: string,
    tracked: MonthlyPlatform[] = MONTHLY_PLATFORMS,
    now: Date = new Date()
  ): Promise<MonthlyOverview> {
    const progress = monthProgress(month, now);
    const [rows, previousRows, topGenre, closed] = await Promise.all([
      this.getRows(month),
      this.getRows(previousMonth(month)),
      // Yarım ayda yayınlanan videolar henüz görüntülenme toplamadı; tür
      // kıyası videonun yaşına göre çarpık olurdu, gösterilmez.
      progress.inProgress ? Promise.resolve(null) : this.getTopGenre(month),
      this.isMonthClosed(month),
    ]);

    const opts = { inProgress: progress.inProgress };
    const completeness = monthCompleteness(month, rows, tracked, closed);
    const platformRows = buildPlatformRows(rows, previousRows, tracked, opts);

    return {
      kpis: buildKpis(rows, previousRows, tracked, opts),
      platformRows,
      insights: buildInsights({
        platforms: platformRows,
        topGenre,
        missingPlatforms: completeness.platforms.filter((p) => p.missing).map((p) => p.label),
      }),
      completeness,
      progress,
    };
  },
};
