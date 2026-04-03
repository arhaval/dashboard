/**
 * Intelligence Report Service
 * Haftalık ve aylık kapsamlı rapor verisi üretir
 * İçerik + Sosyal + Finans + Ekip verilerini birleştirir
 */

import { createClient } from '@/lib/supabase/server';
import { contentPlanService } from './content-plan.service';
import { contentGoalService } from './content-goal.service';
import { socialMetricsService } from './social-metrics.service';
import { financeService } from './finance.service';

// ─── Hafta yardımcıları ───────────────────────────────

export function getWeekRange(date = new Date()): { start: string; end: string; label: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const label = `${start.getDate()} ${start.toLocaleDateString('tr-TR', { month: 'long' })} – ${end.getDate()} ${end.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;

  return { start: fmt(start), end: fmt(end), label };
}

export function getPrevWeekRange(): { start: string; end: string; label: string } {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getWeekRange(d);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPrevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

// ─── Haftalık Rapor ──────────────────────────────────

export interface WeeklyContentRow {
  platform: string;
  sub_type: string;
  target: number;
  done: number;
  diff: number;
  pct: number;
  status: 'hit' | 'close' | 'miss';
}

export interface WeeklyReport {
  week: { start: string; end: string; label: string };
  // İçerik
  contentRows: WeeklyContentRow[];
  totalTarget: number;
  totalDone: number;
  contentAchievementPct: number;
  // Finans
  weekIncome: number;
  weekExpense: number;
  weekNet: number;
  // Ekip
  completedWorkItems: number;
  pendingWorkItems: number;
  // Program uyumu
  scheduleAdherence: number; // 0-100
  // Vurgular
  highlights: string[];
  gaps: string[];
  // Genel skor (0-100)
  score: number;
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  prevMonth: string;
  // İçerik
  contentTotal: number;
  contentPrevTotal: number;
  contentGrowthPct: number;
  byType: { VOICE: number; EDIT: number; STREAM: number };
  completionRate: number;
  overdueCount: number;
  // Sosyal
  youtube: {
    videoViews: number; shortsViews: number; liveViews: number;
    totalLikes: number; totalComments: number; subscribersTotal: number;
    prevVideoViews: number; prevShortsViews: number; prevSubscribersTotal: number;
  };
  instagram: {
    views: number; likes: number; comments: number; saves: number; shares: number;
    followersTotal: number;
    prevViews: number; prevFollowersTotal: number;
  };
  twitch: {
    liveViews: number; avgViewers: number; peakViewers: number;
    subsTotal: number; totalStreamMinutes: number;
    prevLiveViews: number;
  };
  // Finans
  income: number; expense: number; net: number;
  prevIncome: number; prevExpense: number; prevNet: number;
  incomePct: number; expensePct: number; netPct: number;
  // Hedef başarısı (bu ay ortalama)
  goalAchievementPct: number;
  // En iyi / en kötü hafta
  bestWeekStart: string | null;
  // Büyüme skorları
  growthScore: number; // 0-100
}

export const intelligenceReportService = {

  // ─── Haftalık Rapor ─────────────────────────────────

  async getWeeklyReport(weekStart?: string): Promise<WeeklyReport> {
    const week = weekStart
      ? getWeekRange(new Date(weekStart))
      : getWeekRange();

    const supabase = await createClient();

    // İçerik planları bu hafta
    const { data: plans } = await supabase
      .from('content_plans')
      .select('platform, content_subtype, status, planned_date, content_type')
      .gte('planned_date', week.start)
      .lte('planned_date', week.end);

    // Hedefler
    const goals = await contentGoalService.getAll();

    // Finans bu hafta
    const { data: txns } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('transaction_date', week.start)
      .lte('transaction_date', week.end);

    // İş kalemleri bu hafta
    const { data: workItems } = await supabase
      .from('work_items')
      .select('status')
      .gte('work_date', week.start)
      .lte('work_date', week.end);

    // İçerik satırları
    const donePlans = (plans ?? []).filter((p) => p.status === 'DONE');

    const contentRows: WeeklyContentRow[] = goals
      .filter((g) => g.weekly_target > 0)
      .map((g) => {
        const done = donePlans.filter(
          (p) => p.platform === g.platform && p.content_subtype === g.sub_type
        ).length;
        const diff = done - g.weekly_target;
        const pct = Math.round((done / g.weekly_target) * 100);
        const status = done >= g.weekly_target ? 'hit' : pct >= 75 ? 'close' : 'miss';
        return {
          platform: g.platform,
          sub_type: g.sub_type,
          target: g.weekly_target,
          done,
          diff,
          pct: Math.min(pct, 100),
          status,
        };
      });

    const totalTarget = contentRows.reduce((s, r) => s + r.target, 0);
    const totalDone = contentRows.reduce((s, r) => s + r.done, 0);
    const contentAchievementPct =
      totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

    // Finans
    const weekIncome = (txns ?? [])
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount), 0);
    const weekExpense = (txns ?? [])
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount), 0);
    const weekNet = weekIncome - weekExpense;

    // Ekip
    const completedWorkItems = (workItems ?? []).filter((w) => w.status === 'PAID' || w.status === 'APPROVED').length;
    const pendingWorkItems = (workItems ?? []).filter((w) => w.status === 'DRAFT').length;

    // Vurgular & eksikler
    const highlights: string[] = [];
    const gaps: string[] = [];

    contentRows.forEach((r) => {
      const platformLabel = r.platform === 'YOUTUBE' ? 'YouTube' : r.platform === 'INSTAGRAM' ? 'Instagram' : 'Twitter/X';
      const typeLabel = r.sub_type === 'VIDEO' ? 'Video' : r.sub_type === 'SHORTS' ? 'Shorts' : r.sub_type === 'REELS' ? 'Reels' : 'Gönderi';
      if (r.status === 'hit') {
        if (r.done > r.target) {
          highlights.push(`${platformLabel} ${typeLabel}: Hedef aşıldı! ${r.done}/${r.target} 🎉`);
        } else {
          highlights.push(`${platformLabel} ${typeLabel}: Hedef tutturuldu ✓`);
        }
      } else if (r.status === 'miss') {
        gaps.push(`${platformLabel} ${typeLabel}: ${r.done}/${r.target} — ${r.target - r.done} eksik`);
      }
    });

    if (weekNet > 0) highlights.push(`Net gelir: +${weekNet.toLocaleString('tr-TR')} ₺`);
    if (weekExpense > weekIncome && weekIncome > 0) gaps.push('Bu hafta giderler geliri aştı');

    // Genel skor
    const score = Math.min(100, Math.round(
      contentAchievementPct * 0.6 +
      (weekNet > 0 ? 20 : 0) +
      (completedWorkItems > 0 ? 20 : 0)
    ));

    return {
      week,
      contentRows,
      totalTarget,
      totalDone,
      contentAchievementPct,
      weekIncome,
      weekExpense,
      weekNet,
      completedWorkItems,
      pendingWorkItems,
      scheduleAdherence: contentAchievementPct,
      highlights,
      gaps,
      score,
    };
  },

  // ─── Aylık Rapor ────────────────────────────────────

  async getMonthlyReport(month?: string): Promise<MonthlyReport> {
    const m = month ?? getCurrentMonth();
    const prev = getPrevMonth(m);

    const [y, mo] = m.split('-').map(Number);
    const monthLabel = new Date(y, mo - 1, 1).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });

    const supabase = await createClient();

    // İçerik planları
    const [currentPlans, prevPlans] = await Promise.all([
      contentPlanService.getByMonth(m),
      contentPlanService.getByMonth(prev),
    ]);

    const done = currentPlans.filter((p) => p.status === 'DONE');
    const prevDone = prevPlans.filter((p) => p.status === 'DONE');
    const contentTotal = done.length;
    const contentPrevTotal = prevDone.length;

    // Sosyal metrikler
    const platforms = ['YOUTUBE', 'INSTAGRAM', 'TWITCH'] as const;
    const [ytCur, igCur, twCur, ytPrev, igPrev, twPrev] = await Promise.all([
      socialMetricsService.getByMonthAndPlatform(m, 'YOUTUBE'),
      socialMetricsService.getByMonthAndPlatform(m, 'INSTAGRAM'),
      socialMetricsService.getByMonthAndPlatform(m, 'TWITCH'),
      socialMetricsService.getByMonthAndPlatform(prev, 'YOUTUBE'),
      socialMetricsService.getByMonthAndPlatform(prev, 'INSTAGRAM'),
      socialMetricsService.getByMonthAndPlatform(prev, 'TWITCH'),
    ]);

    // Finans
    const getMonthStart = (mo: string) => `${mo}-01`;
    const getMonthEnd = (mo: string) => {
      const [y, mm] = mo.split('-').map(Number);
      return new Date(y, mm, 0).toISOString().slice(0, 10);
    };

    const [curTxns, prevTxns] = await Promise.all([
      supabase.from('transactions').select('type, amount')
        .gte('transaction_date', getMonthStart(m))
        .lte('transaction_date', getMonthEnd(m)),
      supabase.from('transactions').select('type, amount')
        .gte('transaction_date', getMonthStart(prev))
        .lte('transaction_date', getMonthEnd(prev)),
    ]);

    const sumByType = (txns: any[], type: string) =>
      (txns ?? []).filter((t: any) => t.type === type).reduce((s: number, t: any) => s + Number(t.amount), 0);

    const income = sumByType(curTxns.data ?? [], 'INCOME');
    const expense = sumByType(curTxns.data ?? [], 'EXPENSE');
    const net = income - expense;
    const prevIncome = sumByType(prevTxns.data ?? [], 'INCOME');
    const prevExpense = sumByType(prevTxns.data ?? [], 'EXPENSE');
    const prevNet = prevIncome - prevExpense;

    // Hedef başarısı
    const goalProgress = await contentGoalService.getWeeklyProgress();
    const activeGoals = goalProgress.filter((g) => g.weekly_target > 0);
    const goalAchievementPct = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => s + g.pct, 0) / activeGoals.length)
      : 0;

    // Büyüme skoru
    const ytGrowth = pctChange(ytCur?.video_views ?? 0, ytPrev?.video_views ?? 0);
    const igGrowth = pctChange(igCur?.views ?? 0, igPrev?.views ?? 0);
    const contentGrowth = pctChange(contentTotal, contentPrevTotal);
    const growthScore = Math.min(100, Math.max(0, Math.round((ytGrowth + igGrowth + contentGrowth) / 3 + 50)));

    return {
      month: m,
      monthLabel,
      prevMonth: prev,
      contentTotal,
      contentPrevTotal,
      contentGrowthPct: pctChange(contentTotal, contentPrevTotal),
      byType: {
        VOICE: done.filter((p) => p.content_type === 'VOICE').length,
        EDIT: done.filter((p) => p.content_type === 'EDIT').length,
        STREAM: done.filter((p) => p.content_type === 'STREAM').length,
      },
      completionRate: currentPlans.length > 0
        ? Math.round((done.length / currentPlans.length) * 100) : 0,
      overdueCount: currentPlans.filter(
        (p) => (p.status === 'PLANNED' || p.status === 'IN_PROGRESS') &&
          p.planned_date < new Date().toISOString().slice(0, 10)
      ).length,
      youtube: {
        videoViews: ytCur?.video_views ?? 0,
        shortsViews: ytCur?.shorts_views ?? 0,
        liveViews: ytCur?.live_views ?? 0,
        totalLikes: ytCur?.total_likes ?? 0,
        totalComments: ytCur?.total_comments ?? 0,
        subscribersTotal: ytCur?.subscribers_total ?? 0,
        prevVideoViews: ytPrev?.video_views ?? 0,
        prevShortsViews: ytPrev?.shorts_views ?? 0,
        prevSubscribersTotal: ytPrev?.subscribers_total ?? 0,
      },
      instagram: {
        views: igCur?.views ?? 0,
        likes: igCur?.likes ?? 0,
        comments: igCur?.comments ?? 0,
        saves: igCur?.saves ?? 0,
        shares: igCur?.shares ?? 0,
        followersTotal: igCur?.followers_total ?? 0,
        prevViews: igPrev?.views ?? 0,
        prevFollowersTotal: igPrev?.followers_total ?? 0,
      },
      twitch: {
        liveViews: twCur?.live_views ?? 0,
        avgViewers: twCur?.avg_viewers ?? 0,
        peakViewers: twCur?.peak_viewers ?? 0,
        subsTotal: twCur?.subs_total ?? 0,
        totalStreamMinutes: twCur?.total_stream_time_minutes ?? 0,
        prevLiveViews: twPrev?.live_views ?? 0,
      },
      income, expense, net,
      prevIncome, prevExpense, prevNet,
      incomePct: pctChange(income, prevIncome),
      expensePct: pctChange(expense, prevExpense),
      netPct: pctChange(net, prevNet),
      goalAchievementPct,
      bestWeekStart: null,
      growthScore,
    };
  },

  // ─── Son N aylık özet trend ──────────────────────────

  async getGrowthTrend(months = 6) {
    const now = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });

      const plans = await contentPlanService.getByMonth(m);
      const done = plans.filter((p) => p.status === 'DONE').length;

      const [yt, ig] = await Promise.all([
        socialMetricsService.getByMonthAndPlatform(m, 'YOUTUBE'),
        socialMetricsService.getByMonthAndPlatform(m, 'INSTAGRAM'),
      ]);

      result.push({
        month: m,
        label,
        content: done,
        ytViews: (yt?.video_views ?? 0) + (yt?.shorts_views ?? 0),
        igViews: ig?.views ?? 0,
      });
    }

    return result;
  },
};
