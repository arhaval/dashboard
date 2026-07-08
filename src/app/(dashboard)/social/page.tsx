/**
 * Social Stats Page
 * Dashboard for social media metrics with trends, goals, and notes
 * Admin: Full access (view + edit)
 * Team members: Read-only view
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { socialMetricsService, userService } from '@/services';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';
import { instagramService } from '@/services/instagram.service';
import { tr } from '@/lib/i18n';
import { MetricsForm } from './metrics-form';
import { YouTubeConnect } from './youtube-connect';
import { InstagramConnect } from './instagram-connect';
import { PlatformSummary } from './platform-summary';
import { PlatformHistory } from './platform-history';
import { TrendCharts } from './trend-charts';
import { MonthlyNotes } from './monthly-notes';
import { GoalProgress } from './goal-progress';
import { PlatformDetailCards } from './platform-details';
import { GrowthReport } from './growth-report';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default async function SocialPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const currentMonth = getCurrentMonth();

  // Active month = most recent COMPLETE month. We skip the in-progress current
  // calendar month on purpose: comparing a partial month (e.g. July, 8 days in)
  // against a full previous month makes every metric look like a ~90% crash.
  // Once the month ends it's included automatically. (The top follower strip
  // still shows live current counts via getLatestFollowers.)
  const availableMonths = await socialMetricsService.getAvailableMonths();
  const completeMonths = availableMonths.filter((m) => m < currentMonth);
  const monthPool = completeMonths.length > 0 ? completeMonths : availableMonths;
  let activeMonth = monthPool[0] ?? currentMonth;
  let currentMetrics = await socialMetricsService.getByMonth(activeMonth);

  // If the chosen month has all-zero data, fall back to the next one
  const hasRealData = currentMetrics.some((m) => (m.followers_total || 0) > 0);
  if (!hasRealData && monthPool.length > 1) {
    activeMonth = monthPool[1];
    currentMetrics = await socialMetricsService.getByMonth(activeMonth);
  }

  const prevMonth = getPreviousMonth(activeMonth);
  const [previousMetrics, trendData, monthNote, goalProgress, growthReport] = await Promise.all([
    socialMetricsService.getByMonth(prevMonth),
    socialMetricsService.getTrendData(),
    socialMetricsService.getNoteForMonth(activeMonth),
    socialMetricsService.getGoalProgress(activeMonth),
    socialMetricsService.getMonthlyGrowthReport(activeMonth),
  ]);

  const ytStatus = isAdmin
    ? await youtubeAnalyticsService.getStatus()
    : { connected: false };
  const igStatus = isAdmin
    ? await instagramService.getStatus()
    : { connected: false, username: null };

  const latestFollowers = await socialMetricsService.getLatestFollowers();

  return (
    <PageShell
      title={tr.pages.social.title}
      description={isAdmin ? tr.pages.social.subtitle : 'Sosyal medya performansını görüntüle'}
    >
      {/* Platform follower summary — original logos, latest counts */}
      <div className="mb-6">
        <PlatformSummary followers={latestFollowers} />
      </div>

      {/* Monthly Growth Report */}
      <div className="mb-6">
        <GrowthReport report={growthReport} />
      </div>

      {/* Platform Detail Cards - All metrics per platform */}
      <div className="mb-6">
        <PlatformDetailCards
          currentMetrics={currentMetrics}
          previousMetrics={previousMetrics}
          activeMonth={activeMonth}
        />
      </div>

      {/* Trend Charts */}
      <div className="mb-6">
        <TrendCharts trendData={trendData} />
      </div>

      {/* Goals + Notes - Side by side */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <GoalProgress month={activeMonth} goals={goalProgress} isAdmin={isAdmin} />
        <MonthlyNotes
          month={activeMonth}
          initialNotes={monthNote?.notes || ''}
          isAdmin={isAdmin}
        />
      </div>

      {/* Manual Entry - Admin only */}
      {isAdmin && (
        <div className="mb-6">
          <YouTubeConnect connected={ytStatus.connected} />
          <InstagramConnect connected={igStatus.connected} username={igStatus.username} />
          <MetricsForm />
        </div>
      )}

      {/* Platform History */}
      <PlatformHistory isReadOnly={!isAdmin} />
    </PageShell>
  );
}
