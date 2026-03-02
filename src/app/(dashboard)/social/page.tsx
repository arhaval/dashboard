/**
 * Social Stats Page
 * Dashboard for social media metrics
 * Admin: Full access (view + edit)
 * Team members: Read-only view
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { socialMetricsService, userService } from '@/services';
import { cn, formatNumber, getPlatformLabel, getPlatformBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { MetricsForm } from './metrics-form';
import { SyncButtons } from './sync-buttons';
import { PlatformHistory } from './platform-history';
import type { PlatformGrowth } from '@/types';

function formatGrowth(num: number): string {
  const prefix = num >= 0 ? '+' : '';
  return prefix + formatNumber(num);
}

function SummaryCards({
  totalLiveViews,
  totalFollowersGrowth,
  totalEngagement,
  platformCount,
}: {
  totalLiveViews: number;
  totalFollowersGrowth: number;
  totalEngagement: number;
  platformCount: number;
}) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-4">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Toplam Canlı İzlenme</p>
        <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {formatNumber(totalLiveViews)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Twitch + YouTube</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Takipçi Büyümesi</p>
        {totalFollowersGrowth === 0 ? (
          <p className="text-2xl font-semibold text-[var(--color-text-muted)]">—</p>
        ) : (
          <p
            className={cn(
              'text-2xl font-semibold',
              totalFollowersGrowth >= 0
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-error)]'
            )}
          >
            {formatGrowth(totalFollowersGrowth)}
          </p>
        )}
        <p className="text-xs text-[var(--color-text-muted)]">önceki aya göre</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Toplam Etkileşim</p>
        <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {formatNumber(totalEngagement)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Tüm platformlar</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Platformlar</p>
        <p className="text-2xl font-semibold text-[var(--color-accent)]">
          {platformCount}/4
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Bu ay veri olan</p>
      </div>
    </div>
  );
}

function PlatformTable({ growthData }: { growthData: PlatformGrowth[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.social.fields.platform}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.social.fields.followers}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.social.fields.views}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.social.fields.engagement}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              Büyüme
            </th>
          </tr>
        </thead>
        <tbody>
          {growthData.map((data, index) => (
            <tr
              key={data.platform}
              className={cn(
                'border-b border-[var(--color-border)] last:border-b-0',
                index % 2 === 0
                  ? 'bg-[var(--color-table-row-even)]'
                  : 'bg-[var(--color-table-row-odd)]'
              )}
            >
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5',
                    'text-xs font-medium',
                    getPlatformBadgeClass(data.platform)
                  )}
                >
                  {getPlatformLabel(data.platform)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-primary)]">
                {formatNumber(data.followers_current)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-primary)]">
                {formatNumber(data.views_current)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-primary)]">
                {formatNumber(data.engagement_current)}
              </td>
              <td className="px-4 py-3 text-right">
                {data.isFirstRecord ? (
                  <span className="text-sm text-[var(--color-text-muted)]">
                    İlk Kayıt
                  </span>
                ) : (
                  <>
                    <span
                      className={cn(
                        'font-mono text-sm',
                        data.followers_growth >= 0
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-error)]'
                      )}
                    >
                      {formatGrowth(data.followers_growth)}
                    </span>
                    {data.followers_growth_percent !== 0 && (
                      <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                        ({data.followers_growth_percent > 0 ? '+' : ''}
                        {data.followers_growth_percent.toFixed(1)}%)
                      </span>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SocialPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  const [summary, growthData] = await Promise.all([
    socialMetricsService.getDashboardSummary(),
    socialMetricsService.getGrowthData(),
  ]);

  return (
    <PageShell
      title={tr.pages.social.title}
      description={isAdmin ? tr.pages.social.subtitle : 'Sosyal medya performansını görüntüle'}
    >
      {/* Summary Cards */}
      <SummaryCards
        totalLiveViews={summary.totalLiveViews}
        totalFollowersGrowth={summary.totalFollowersGrowth}
        totalEngagement={summary.totalEngagement}
        platformCount={summary.platformCount}
      />

      {/* API Sync + Manual Entry - Admin only */}
      {isAdmin && (
        <div className="mb-6 space-y-4">
          <SyncButtons />
          <MetricsForm />
        </div>
      )}

      {/* Platform Overview Table */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
          Platform Özeti (Bu Ay)
        </h3>
        <PlatformTable growthData={growthData} />
      </div>

      {/* Platform History */}
      <PlatformHistory isReadOnly={!isAdmin} />
    </PageShell>
  );
}
