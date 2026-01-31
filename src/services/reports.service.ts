/**
 * Reports Service
 * Generates monthly performance reports combining social, work, and finance data
 */

import { createClient } from '@/lib/supabase/server';
import type { MetricsPlatform, SocialMonthlyMetrics, TransactionType } from '@/types';

// Helper to get previous month in YYYY-MM format
function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Helper to get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Platform growth data
export interface PlatformReportData {
  platform: MetricsPlatform;
  followers: number;
  views: number;
  engagement: number;
  growth: number;
  growthPercent: number;
  status: 'growing' | 'stable' | 'declining';
  isFirstRecord: boolean;
}

// Work items summary
export interface WorkItemsSummary {
  total: number;
  approved: number;
  paid: number;
  draft: number;
}

// Finance summary
export interface FinanceSummary {
  income: number;
  expense: number;
  netBalance: number;
}

// Social summary
export interface SocialSummary {
  totalLiveViews: number;
  totalFollowersGrowth: number;
  totalEngagement: number;
  previousLiveViews: number;
  previousEngagement: number;
}

// Smart report suggestions
export interface ReportInsights {
  fastestGrowingPlatform: MetricsPlatform | null;
  decliningPlatform: MetricsPlatform | null;
  liveViewsTrend: 'up' | 'down' | 'stable';
  workItemsTrend: 'up' | 'down' | 'stable';
  expenseTrend: 'up' | 'down' | 'stable';
  summaryText: string;
  suggestions: string[];
}

// Full monthly report
export interface MonthlyReport {
  month: string;
  monthLabel: string;
  socialSummary: SocialSummary;
  platformData: PlatformReportData[];
  workItemsSummary: WorkItemsSummary;
  financeSummary: FinanceSummary;
  insights: ReportInsights;
}

// Get engagement for a platform
function getEngagement(metrics: SocialMonthlyMetrics | null): number {
  if (!metrics) return 0;
  switch (metrics.platform) {
    case 'TWITCH':
      return metrics.unique_chatters || 0;
    case 'YOUTUBE':
      return (metrics.total_likes || 0) + (metrics.total_comments || 0);
    case 'INSTAGRAM':
      return (
        (metrics.likes || 0) +
        (metrics.comments || 0) +
        (metrics.saves || 0) +
        (metrics.shares || 0)
      );
    case 'X':
      return (metrics.likes || 0) + (metrics.replies || 0);
    default:
      return 0;
  }
}

// Get views for a platform
function getViews(metrics: SocialMonthlyMetrics | null): number {
  if (!metrics) return 0;
  switch (metrics.platform) {
    case 'TWITCH':
      return metrics.live_views || 0;
    case 'YOUTUBE':
      return (
        (metrics.video_views || 0) +
        (metrics.shorts_views || 0) +
        (metrics.live_views || 0)
      );
    case 'INSTAGRAM':
      return metrics.views || 0;
    case 'X':
      return metrics.impressions || 0;
    default:
      return 0;
  }
}

// Format month label in Turkish
function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

// Generate smart report text in Turkish
function generateInsights(
  platformData: PlatformReportData[],
  socialSummary: SocialSummary,
  workCurrent: WorkItemsSummary,
  workPrevious: WorkItemsSummary,
  financeCurrent: FinanceSummary,
  financePrevious: FinanceSummary
): ReportInsights {
  // Find fastest growing and declining platforms
  const sortedByGrowth = [...platformData].sort((a, b) => b.growth - a.growth);
  const fastestGrowing = sortedByGrowth.find((p) => p.growth > 0) || null;
  const declining = sortedByGrowth.reverse().find((p) => p.growth < 0) || null;

  // Trends
  const liveViewsTrend =
    socialSummary.totalLiveViews > socialSummary.previousLiveViews
      ? 'up'
      : socialSummary.totalLiveViews < socialSummary.previousLiveViews
      ? 'down'
      : 'stable';

  const workItemsTrend =
    workCurrent.total > workPrevious.total
      ? 'up'
      : workCurrent.total < workPrevious.total
      ? 'down'
      : 'stable';

  const expenseTrend =
    financeCurrent.expense > financePrevious.expense
      ? 'up'
      : financeCurrent.expense < financePrevious.expense
      ? 'down'
      : 'stable';

  // Generate summary text
  const sentences: string[] = [];

  // Followers growth
  if (socialSummary.totalFollowersGrowth > 0) {
    sentences.push(
      `Bu ay toplam takipçi sayısı ${socialSummary.totalFollowersGrowth.toLocaleString('tr-TR')} kişi artış gösterdi.`
    );
  } else if (socialSummary.totalFollowersGrowth < 0) {
    sentences.push(
      `Bu ay toplam takipçi sayısı ${Math.abs(socialSummary.totalFollowersGrowth).toLocaleString('tr-TR')} kişi azaldı.`
    );
  } else {
    sentences.push('Takipçi sayısı geçen aya göre sabit kaldı.');
  }

  // Best platform
  if (fastestGrowing) {
    const platformNames: Record<MetricsPlatform, string> = {
      TWITCH: 'Twitch',
      YOUTUBE: 'YouTube',
      INSTAGRAM: 'Instagram',
      X: 'X',
    };
    sentences.push(
      `En hızlı büyüyen platform ${platformNames[fastestGrowing.platform]} oldu (+${fastestGrowing.growth.toLocaleString('tr-TR')} takipçi).`
    );
  }

  // Live views trend
  if (liveViewsTrend === 'up') {
    sentences.push('Canlı yayın izlenmeleri geçen aya göre artış gösterdi.');
  } else if (liveViewsTrend === 'down') {
    sentences.push('Canlı yayın izlenmeleri geçen aya göre düşüş yaşadı.');
  }

  // Work items
  sentences.push(
    `Bu ay toplam ${workCurrent.total} iş kaydı oluşturuldu, bunların ${workCurrent.paid} tanesi ödendi.`
  );

  // Finance
  if (financeCurrent.netBalance >= 0) {
    sentences.push(
      `Aylık net bakiye ${financeCurrent.netBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} pozitif.`
    );
  } else {
    sentences.push(
      `Aylık net bakiye ${Math.abs(financeCurrent.netBalance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} negatif.`
    );
  }

  // Generate suggestions
  const suggestions: string[] = [];

  if (declining) {
    const platformNames: Record<MetricsPlatform, string> = {
      TWITCH: 'Twitch',
      YOUTUBE: 'YouTube',
      INSTAGRAM: 'Instagram',
      X: 'X',
    };
    suggestions.push(
      `${platformNames[declining.platform]} platformunda takipçi kaybı yaşanıyor, içerik stratejisi gözden geçirilmeli.`
    );
  }

  if (workCurrent.draft > workCurrent.paid) {
    suggestions.push(
      `Onay bekleyen iş kayıtları mevcut, ödeme süreçleri hızlandırılmalı.`
    );
  }

  if (expenseTrend === 'up') {
    suggestions.push('Giderler artış trendinde, maliyet optimizasyonu değerlendirilmeli.');
  }

  if (liveViewsTrend === 'down') {
    suggestions.push('Canlı yayın performansı düşüşte, yayın saatleri ve içerik çeşitliliği artırılmalı.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Mevcut performans seviyesi korunmalı.');
    suggestions.push('Yeni platformlar ve içerik formatları denenebilir.');
    suggestions.push('Topluluk etkileşimi artırıcı aktiviteler planlanabilir.');
  }

  return {
    fastestGrowingPlatform: fastestGrowing?.platform || null,
    decliningPlatform: declining?.platform || null,
    liveViewsTrend,
    workItemsTrend,
    expenseTrend,
    summaryText: sentences.join(' '),
    suggestions: suggestions.slice(0, 3),
  };
}

export const reportsService = {
  /**
   * Get available months that have data
   */
  async getAvailableMonths(): Promise<string[]> {
    const supabase = await createClient();

    // Get months from social metrics
    const { data: socialMonths } = await supabase
      .from('social_monthly_metrics')
      .select('month')
      .order('month', { ascending: false });

    // Get months from work items
    const { data: workMonths } = await supabase
      .from('work_items')
      .select('work_date');

    // Combine and dedupe
    const months = new Set<string>();

    socialMonths?.forEach((s) => months.add(s.month));
    workMonths?.forEach((w) => {
      const date = new Date(w.work_date);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });

    // Add current month if not present
    months.add(getCurrentMonth());

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  },

  /**
   * Get monthly report for a specific month
   */
  async getMonthlyReport(month?: string): Promise<MonthlyReport> {
    const targetMonth = month || getCurrentMonth();
    const previousMonth = getPreviousMonth(targetMonth);
    const supabase = await createClient();

    // Parallel queries for current month data
    const [
      { data: currentSocial },
      { data: previousSocial },
      { data: currentWorkItems },
      { data: previousWorkItems },
      { data: currentTransactions },
      { data: previousTransactions },
    ] = await Promise.all([
      // Current month social
      supabase
        .from('social_monthly_metrics')
        .select('*')
        .eq('month', targetMonth),
      // Previous month social
      supabase
        .from('social_monthly_metrics')
        .select('*')
        .eq('month', previousMonth),
      // Current month work items
      supabase
        .from('work_items')
        .select('status')
        .gte('work_date', `${targetMonth}-01`)
        .lt('work_date', `${targetMonth}-32`),
      // Previous month work items
      supabase
        .from('work_items')
        .select('status')
        .gte('work_date', `${previousMonth}-01`)
        .lt('work_date', `${previousMonth}-32`),
      // Current month transactions
      supabase
        .from('transactions')
        .select('type, amount')
        .gte('transaction_date', `${targetMonth}-01`)
        .lt('transaction_date', `${targetMonth}-32`),
      // Previous month transactions
      supabase
        .from('transactions')
        .select('type, amount')
        .gte('transaction_date', `${previousMonth}-01`)
        .lt('transaction_date', `${previousMonth}-32`),
    ]);

    // Process social data
    const platforms: MetricsPlatform[] = ['TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X'];
    const platformData: PlatformReportData[] = [];
    let totalLiveViews = 0;
    let totalFollowersGrowth = 0;
    let totalEngagement = 0;
    let previousLiveViews = 0;
    let previousEngagement = 0;

    for (const platform of platforms) {
      const current = currentSocial?.find((s) => s.platform === platform) || null;
      const previous = previousSocial?.find((s) => s.platform === platform) || null;

      const followers = current?.followers_total || 0;
      const prevFollowers = previous?.followers_total || 0;

      // If no previous data exists, this is the first record - growth should be 0
      const isFirstRecord = !previous && !!current;
      const growth = isFirstRecord ? 0 : (followers - prevFollowers);
      const growthPercent = prevFollowers > 0 ? (growth / prevFollowers) * 100 : 0;
      const views = getViews(current);
      const engagement = getEngagement(current);

      // Accumulate totals (only add growth if not first record)
      if (platform === 'TWITCH' || platform === 'YOUTUBE') {
        totalLiveViews += current?.live_views || 0;
        previousLiveViews += previous?.live_views || 0;
      }
      // Don't count first records as growth
      if (!isFirstRecord) {
        totalFollowersGrowth += (followers - prevFollowers);
      }
      totalEngagement += engagement;
      previousEngagement += getEngagement(previous);

      platformData.push({
        platform,
        followers,
        views,
        engagement,
        growth,
        growthPercent: Math.round(growthPercent * 100) / 100,
        status: isFirstRecord ? 'stable' : (growth > 0 ? 'growing' : growth < 0 ? 'declining' : 'stable'),
        isFirstRecord,
      });
    }

    // Process work items
    const workCurrent: WorkItemsSummary = {
      total: currentWorkItems?.length || 0,
      approved: currentWorkItems?.filter((w) => w.status === 'APPROVED').length || 0,
      paid: currentWorkItems?.filter((w) => w.status === 'PAID').length || 0,
      draft: currentWorkItems?.filter((w) => w.status === 'DRAFT').length || 0,
    };

    const workPrevious: WorkItemsSummary = {
      total: previousWorkItems?.length || 0,
      approved: previousWorkItems?.filter((w) => w.status === 'APPROVED').length || 0,
      paid: previousWorkItems?.filter((w) => w.status === 'PAID').length || 0,
      draft: previousWorkItems?.filter((w) => w.status === 'DRAFT').length || 0,
    };

    // Process finance
    const financeCurrent: FinanceSummary = {
      income:
        currentTransactions
          ?.filter((t) => t.type === 'INCOME')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      expense:
        currentTransactions
          ?.filter((t) => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      netBalance: 0,
    };
    financeCurrent.netBalance = financeCurrent.income - financeCurrent.expense;

    const financePrevious: FinanceSummary = {
      income:
        previousTransactions
          ?.filter((t) => t.type === 'INCOME')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      expense:
        previousTransactions
          ?.filter((t) => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      netBalance: 0,
    };
    financePrevious.netBalance = financePrevious.income - financePrevious.expense;

    // Social summary
    const socialSummary: SocialSummary = {
      totalLiveViews,
      totalFollowersGrowth,
      totalEngagement,
      previousLiveViews,
      previousEngagement,
    };

    // Generate insights
    const insights = generateInsights(
      platformData,
      socialSummary,
      workCurrent,
      workPrevious,
      financeCurrent,
      financePrevious
    );

    return {
      month: targetMonth,
      monthLabel: formatMonthLabel(targetMonth),
      socialSummary,
      platformData,
      workItemsSummary: workCurrent,
      financeSummary: financeCurrent,
      insights,
    };
  },
};
