/**
 * Social Stats Page
 * Dashboard for social media metrics with trends, goals, and notes
 * Admin: Full access (view + edit)
 * Team members: Read-only view
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { socialMetricsService, userService } from '@/services';
import { tr } from '@/lib/i18n';
import { MetricsForm } from './metrics-form';
import { PlatformHistory } from './platform-history';
import { TrendCharts } from './trend-charts';
import { MonthlyNotes } from './monthly-notes';
import { GoalProgress } from './goal-progress';
import { PlatformDetailCards } from './platform-details';

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

  // Determine the active month (most recent with REAL data, skip empty months)
  const availableMonths = await socialMetricsService.getAvailableMonths();
  let activeMonth = availableMonths.length > 0 ? availableMonths[0] : currentMonth;
  let currentMetrics = await socialMetricsService.getByMonth(activeMonth);

  // If most recent month has all-zero data, fall back to the next month
  const hasRealData = currentMetrics.some((m) => (m.followers_total || 0) > 0);
  if (!hasRealData && availableMonths.length > 1) {
    activeMonth = availableMonths[1];
    currentMetrics = await socialMetricsService.getByMonth(activeMonth);
  }

  const prevMonth = getPreviousMonth(activeMonth);
  const [previousMetrics, trendData, monthNote, goalProgress] = await Promise.all([
    socialMetricsService.getByMonth(prevMonth),
    socialMetricsService.getTrendData(),
    socialMetricsService.getNoteForMonth(activeMonth),
    socialMetricsService.getGoalProgress(activeMonth),
  ]);

  return (
    <PageShell
      title={tr.pages.social.title}
      description={isAdmin ? tr.pages.social.subtitle : 'Sosyal medya performansını görüntüle'}
    >
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
          <MetricsForm />
        </div>
      )}

      {/* Platform History */}
      <PlatformHistory isReadOnly={!isAdmin} />
    </PageShell>
  );
}
