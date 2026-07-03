'use client';

import type { MonthlyGrowthReport } from '@/types';

const PLATFORM_LABELS: Record<string, string> = {
  TWITCH: 'Twitch',
  YOUTUBE: 'YouTube',
  INSTAGRAM: 'Instagram',
  X: 'X (Twitter)',
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('tr-TR');
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  return `${months[m - 1]} ${year}`;
}

interface DeltaBadgeProps {
  value: number;
  pct: number;
}

function DeltaBadge({ value, pct }: DeltaBadgeProps) {
  if (value === 0 && pct === 0) return null;
  const positive = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: positive
          ? 'rgba(34, 197, 94, 0.12)'
          : 'rgba(239, 68, 68, 0.12)',
        color: positive ? 'var(--color-success)' : 'var(--color-error)',
      }}
    >
      {positive ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  prev: number;
  change: number;
  changePct: number;
  hint?: string;
}

function StatCard({ label, value, change, changePct, hint }: StatCardProps) {
  return (
    <div
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
        {formatNum(value)}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <DeltaBadge value={change} pct={changePct} />
        {hint && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'growing' | 'stable' | 'declining';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    growing: { label: 'Büyüyor', color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.12)', icon: '↑' },
    stable: { label: 'Stabil', color: 'var(--color-warning)', bg: 'rgba(234, 179, 8, 0.12)', icon: '→' },
    declining: { label: 'Düşüyor', color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.12)', icon: '↓' },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-semibold"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.icon} {config.label}
    </span>
  );
}

interface GrowthReportProps {
  report: MonthlyGrowthReport;
}

export function GrowthReport({ report }: GrowthReportProps) {
  return (
    <div
      className="rounded-[var(--radius-md)] p-5"
      style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Aylık Büyüme Raporu
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {formatMonth(report.activeMonth)} · Tüm platformlar
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* KPI Grid */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Takipçi"
          value={report.totalFollowers}
          prev={report.totalFollowersPrev}
          change={report.totalFollowersChange}
          changePct={report.totalFollowersChangePct}
          hint="geçen aya göre"
        />
        <StatCard
          label="Total Görüntülenme"
          value={report.totalViews}
          prev={report.totalViewsPrev}
          change={report.totalViewsChange}
          changePct={report.totalViewsChangePct}
          hint="tüm platformlar"
        />
        <StatCard
          label="Canlı İzlenme"
          value={report.totalLiveViews}
          prev={report.totalLiveViewsPrev}
          change={report.totalLiveViewsChange}
          changePct={report.totalLiveViewsChangePct}
          hint="Twitch + YouTube"
        />
        <StatCard
          label="Total Etkileşim"
          value={report.totalEngagement}
          prev={report.totalEngagementPrev}
          change={report.totalEngagementChange}
          changePct={report.totalEngagementChangePct}
          hint="beğeni, yorum, sohbet"
        />
      </div>

      {/* Next month targets */}
      {report.platformTargets.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Gelecek Ay Hedefleri (Takipçi)
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {report.platformTargets.map((pt) => {
              const progress = pt.target > 0 ? Math.min(100, Math.round((pt.current / pt.target) * 100)) : 100;
              return (
                <div
                  key={pt.platform}
                  className="rounded-[var(--radius-sm)] p-3"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <p className="mb-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {PLATFORM_LABELS[pt.platform]}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatNum(pt.current)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
                      → {formatNum(pt.target)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent)' }}
                    />
                  </div>
                  {pt.avgMonthlyGrowth > 0 && (
                    <p className="mt-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      Ort. aylık +{formatNum(pt.avgMonthlyGrowth)} takipçi
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
