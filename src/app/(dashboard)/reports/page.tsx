/**
 * Reports Page
 * Monthly performance report with social, work, and finance data
 * UI labels in Turkish
 */

import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageShell } from '@/components/layout';
import { reportsService, userService } from '@/services';
import { cn } from '@/lib/utils';
import { MonthPicker } from './month-picker';
import type { PlatformReportData, MonthlyReport, MetricsPlatform } from '@/types';

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

// Format number with Turkish locale
function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR');
}

// Format currency with Turkish locale
function formatCurrency(num: number): string {
  return num.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

// Get platform label
function getPlatformLabel(platform: MetricsPlatform): string {
  const labels: Record<MetricsPlatform, string> = {
    TWITCH: 'Twitch',
    YOUTUBE: 'YouTube',
    INSTAGRAM: 'Instagram',
    X: 'X',
  };
  return labels[platform];
}

// Get platform badge styles
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

// Get status badge
function getStatusBadge(status: 'growing' | 'stable' | 'declining'): {
  emoji: string;
  text: string;
  className: string;
} {
  switch (status) {
    case 'growing':
      return {
        emoji: '🟢',
        text: 'Büyüyor',
        className: 'text-[var(--color-success)]',
      };
    case 'stable':
      return {
        emoji: '🟡',
        text: 'Sabit',
        className: 'text-[var(--color-warning)]',
      };
    case 'declining':
      return {
        emoji: '🔴',
        text: 'Düşüş',
        className: 'text-[var(--color-error)]',
      };
  }
}

// Summary Cards Component
function SummaryCards({ report }: { report: MonthlyReport }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Toplam Canlı İzlenme */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Toplam Canlı İzlenme</p>
        <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {formatNumber(report.socialSummary.totalLiveViews)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Twitch + YouTube</p>
      </div>

      {/* Takipçi Büyümesi */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Takipçi Büyümesi</p>
        <p
          className={cn(
            'text-2xl font-semibold',
            report.socialSummary.totalFollowersGrowth >= 0
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-error)]'
          )}
        >
          {report.socialSummary.totalFollowersGrowth >= 0 ? '+' : ''}
          {formatNumber(report.socialSummary.totalFollowersGrowth)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Geçen aya göre</p>
      </div>

      {/* Toplam Etkileşim */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Toplam Etkileşim</p>
        <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {formatNumber(report.socialSummary.totalEngagement)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Tüm platformlar</p>
      </div>

      {/* İçerik Üretimi */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">İçerik Üretimi</p>
        <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {report.workItemsSummary.total}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {report.workItemsSummary.approved} onaylı, {report.workItemsSummary.paid} ödendi
        </p>
      </div>

      {/* Net Bakiye */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Net Bakiye</p>
        <p
          className={cn(
            'text-2xl font-semibold',
            report.financeSummary.netBalance >= 0
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-error)]'
          )}
        >
          {formatCurrency(report.financeSummary.netBalance)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Gelir - Gider</p>
      </div>
    </div>
  );
}

// Platform Performance Table
function PlatformTable({ platformData }: { platformData: PlatformReportData[] }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
        Platform Performansı
      </h3>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                Platform
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                Takipçi
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                Görüntülenme
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                Etkileşim
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                Büyüme
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-secondary)]">
                Durum
              </th>
            </tr>
          </thead>
          <tbody>
            {platformData.map((data, index) => {
              const statusBadge = getStatusBadge(data.status);
              return (
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
                    {formatNumber(data.followers)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-primary)]">
                    {formatNumber(data.views)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-[var(--color-text-primary)]">
                    {formatNumber(data.engagement)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-mono text-sm',
                        data.growth >= 0
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-error)]'
                      )}
                    >
                      {data.growth >= 0 ? '+' : ''}
                      {formatNumber(data.growth)}
                    </span>
                    {data.growthPercent !== 0 && (
                      <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                        ({data.growthPercent > 0 ? '+' : ''}
                        {data.growthPercent.toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-sm', statusBadge.className)}>
                      {statusBadge.emoji} {statusBadge.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Smart Report Text
function ReportText({ report }: { report: MonthlyReport }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-text-primary)]">
        Aylık Değerlendirme Raporu
      </h3>

      {/* Summary Text */}
      <p className="mb-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {report.insights.summaryText}
      </p>

      {/* Suggestions */}
      <div>
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Öneriler
        </h4>
        <ul className="space-y-2">
          {report.insights.suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
            >
              <span className="mt-1 text-[var(--color-accent)]">•</span>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  // Only admins can access this page
  if (currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  const params = await searchParams;
  const selectedMonth = params.month;

  const [months, report] = await Promise.all([
    reportsService.getAvailableMonths(),
    reportsService.getMonthlyReport(selectedMonth),
  ]);

  return (
    <PageShell
      title="Raporlar"
      description={`${report.monthLabel} Performans Raporu`}
      actions={
        <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />}>
          <MonthPicker months={months} currentMonth={report.month} />
        </Suspense>
      }
    >
      {/* Summary Cards */}
      <SummaryCards report={report} />

      {/* Platform Performance Table */}
      <PlatformTable platformData={report.platformData} />

      {/* Smart Report Text */}
      <ReportText report={report} />
    </PageShell>
  );
}
