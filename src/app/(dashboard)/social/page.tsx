/**
 * GENEL BAKIŞ — "ne durumdayız?"
 *
 * Bu ekranın tek görevi 10 saniyede durumu okutmak. Bu yüzden burada
 * YALNIZCA: 4 KPI, tek platform tablosu, en fazla 4 içgörü ve küçük hedef
 * şeridi var.
 *
 * Bilinçli olarak BURADA OLMAYANLAR:
 *   trend grafikleri       → /social/analytics (neden böyle oldu)
 *   veri girişi, eksikler  → /social/data      (neyi tamamlamalıyım)
 * Aynı metriği iki ekranda tekrar göstermiyoruz.
 */

import { redirect } from 'next/navigation';
import { socialMetricsService, userService } from '@/services';
import { socialSummaryService } from '@/services/social-summary.service';
import { MonthPicker } from './month-picker';
import { KpiCards } from './kpi-cards';
import { PlatformTable } from './platform-table';
import { InsightsCard } from './insights-card';
import { GoalsCompact } from './goals-compact';
import { ReportBanner } from './report-banner';
import { resolveMonth } from './month.utils';

export const dynamic = 'force-dynamic';

export default async function SocialOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const { month: requested } = await searchParams;
  const available = await socialMetricsService.getAvailableMonths();
  const month = resolveMonth(requested, available);

  const [overview, goals] = await Promise.all([
    socialSummaryService.getOverview(month),
    socialMetricsService.getGoalProgress(month),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <ReportBanner completeness={overview.completeness} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          Tamamlanmış son ayın durumu
        </p>
        <MonthPicker month={month} available={available} />
      </div>

      <KpiCards kpis={overview.kpis} />
      <PlatformTable rows={overview.platformRows} />
      <InsightsCard insights={overview.insights} />
      <GoalsCompact month={month} goals={goals} />
    </div>
  );
}
