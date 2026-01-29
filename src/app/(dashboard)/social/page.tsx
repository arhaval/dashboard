/**
 * Social Stats Page
 * Admin-only dashboard for social media metrics
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { socialMetricsService, userService } from '@/services';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { MetricsForm } from './metrics-form';
import { PlatformHistory } from './platform-history';
import type { MetricsPlatform, PlatformGrowth } from '@/types';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function formatGrowth(num: number): string {
  const prefix = num >= 0 ? '+' : '';
  return prefix + formatNumber(num);
}

function getPlatformLabel(platform: MetricsPlatform): string {
  switch (platform) {
    case 'TWITCH':
      return 'Twitch';
    case 'YOUTUBE':
      return 'YouTube';
    case 'INSTAGRAM':
      return 'Instagram';
    case 'X':
      return 'X';
    default:
      return platform;
  }
}

function getPlatformStyles(platform: MetricsPlatform): string {
  switch (platform) {
    case 'TWITCH':
      return 'bg-purple-500/10 text-purple-400';
    case 'YOUTUBE':
      return 'bg-red-500/10 text-red-400';
    case 'INSTAGRAM':
      return 'bg-pink-500/10 text-pink-400';
    case 'X':
      return 'bg-blue-500/10 text-blue-400';
    default:
      return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  }
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
                    getPlatformStyles(data.platform)
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

  // Only admins can access this page
  if (currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  const [summary, growthData] = await Promise.all([
    socialMetricsService.getDashboardSummary(),
    socialMetricsService.getGrowthData(),
  ]);

  return (
    <PageShell title={tr.pages.social.title} description={tr.pages.social.subtitle}>
      {/* Summary Cards */}
      <SummaryCards
        totalLiveViews={summary.totalLiveViews}
        totalFollowersGrowth={summary.totalFollowersGrowth}
        totalEngagement={summary.totalEngagement}
        platformCount={summary.platformCount}
      />

      {/* Entry Form */}
      <div className="mb-6">
        <MetricsForm />
      </div>

      {/* Platform Overview Table */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
          Platform Özeti (Bu Ay)
        </h3>
        <PlatformTable growthData={growthData} />
      </div>

      {/* Platform History */}
      <PlatformHistory />
    </PageShell>
  );
}
