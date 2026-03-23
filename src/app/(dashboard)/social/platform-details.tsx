'use client';

/**
 * Platform Detail Cards
 * Expandable cards showing summary + detailed metrics per platform
 * Collapsed: 3 key metrics as big numbers
 * Expanded: All platform-specific metrics
 */

import { useState } from 'react';
import { cn, formatNumber, getPlatformLabel, getPlatformBadgeClass } from '@/lib/utils';
import type { SocialMonthlyMetrics, MetricsPlatform } from '@/types';

interface MetricDef {
  label: string;
  key: string;
  format?: 'hours' | 'percent';
}

// Key metrics shown in collapsed state (always visible, big numbers)
const SUMMARY_METRICS: Record<MetricsPlatform, MetricDef[]> = {
  TWITCH: [
    { label: 'Takipçi', key: 'followers_total' },
    { label: 'Ort. İzleyici', key: 'avg_viewers' },
    { label: 'Canlı İzlenme', key: 'live_views' },
  ],
  YOUTUBE: [
    { label: 'Abone', key: 'subscribers_total' },
    { label: 'Video İzlenme', key: 'video_views' },
    { label: 'Canlı İzlenme', key: 'live_views' },
  ],
  INSTAGRAM: [
    { label: 'Takipçi', key: 'followers_total' },
    { label: 'Görüntülenme', key: 'views' },
    { label: 'Beğeni', key: 'likes' },
  ],
  X: [
    { label: 'Takipçi', key: 'followers_total' },
    { label: 'Gösterim', key: 'impressions' },
    { label: 'Beğeni', key: 'likes' },
  ],
};

// Additional metrics shown when expanded
const DETAIL_METRICS: Record<MetricsPlatform, MetricDef[]> = {
  TWITCH: [
    { label: 'Zirve İzleyici', key: 'peak_viewers' },
    { label: 'Tekil İzleyici', key: 'unique_viewers' },
    { label: 'Tekil Sohbet', key: 'unique_chatters' },
    { label: 'Abone', key: 'subs_total' },
    { label: 'Yayın Süresi', key: 'total_stream_time_minutes', format: 'hours' },
  ],
  YOUTUBE: [
    { label: 'Shorts İzlenme', key: 'shorts_views' },
    { label: 'Ort. Canlı İzleyici', key: 'avg_live_viewers' },
    { label: 'Zirve Canlı İzleyici', key: 'peak_live_viewers' },
    { label: 'Beğeni', key: 'total_likes' },
    { label: 'Yorum', key: 'total_comments' },
  ],
  INSTAGRAM: [
    { label: 'Yorum', key: 'comments' },
    { label: 'Kaydetme', key: 'saves' },
    { label: 'Paylaşım', key: 'shares' },
  ],
  X: [
    { label: 'Etkileşim Oranı', key: 'engagement_rate', format: 'percent' },
    { label: 'Yanıt', key: 'replies' },
    { label: 'Profil Ziyareti', key: 'profile_visits' },
  ],
};

function getVal(metrics: SocialMonthlyMetrics | undefined, key: string): number {
  if (!metrics) return 0;
  return (metrics[key as keyof SocialMonthlyMetrics] as number) || 0;
}

function fmtValue(value: number, format?: 'hours' | 'percent'): string {
  if (format === 'hours') {
    const hours = Math.round(value / 60);
    return `${hours} saat`;
  }
  if (format === 'percent') {
    return `%${value.toFixed(1)}`;
  }
  return formatNumber(value);
}

function fmtChange(change: number, format?: 'hours' | 'percent'): string {
  const prefix = change >= 0 ? '+' : '';
  if (format === 'hours') {
    const hours = Math.round(change / 60);
    return `${prefix}${hours}s`;
  }
  if (format === 'percent') {
    return `${prefix}${change.toFixed(1)}%`;
  }
  return prefix + formatNumber(change);
}

// Single platform card
function PlatformCard({
  platform,
  current,
  previous,
}: {
  platform: MetricsPlatform;
  current: SocialMonthlyMetrics | undefined;
  previous: SocialMonthlyMetrics | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFirstRecord = !previous;
  const summary = SUMMARY_METRICS[platform];
  const details = DETAIL_METRICS[platform];

  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
              getPlatformBadgeClass(platform)
            )}
          >
            {getPlatformLabel(platform)}
          </span>
          {isFirstRecord && (
            <span className="rounded-full bg-[var(--color-bg-primary)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              İlk Kayıt
            </span>
          )}
        </div>
      </div>

      {/* Summary: Big numbers */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        {summary.map((metric) => {
          const val = getVal(current, metric.key);
          const prev = getVal(previous, metric.key);
          const change = val - prev;
          const showChange = !isFirstRecord && (val > 0 || prev > 0) && change !== 0;

          return (
            <div key={metric.key}>
              <div className="font-mono text-lg font-medium text-[var(--color-text-primary)]">
                {fmtValue(val, metric.format)}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {metric.label}
              </div>
              {showChange && (
                <div
                  className={cn(
                    'mt-0.5 font-mono text-xs',
                    change > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                  )}
                >
                  {fmtChange(change, metric.format)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full border-t border-[var(--color-border)] pt-2 text-center text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
      >
        {expanded ? 'Gizle \u25B2' : 'Detayları Gör \u25BC'}
      </button>

      {/* Detail metrics (expandable) */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
          {details.map((metric) => {
            const val = getVal(current, metric.key);
            const prev = getVal(previous, metric.key);
            const change = val - prev;
            const showChange = !isFirstRecord && (val > 0 || prev > 0) && change !== 0;

            return (
              <div key={metric.key} className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {metric.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[var(--color-text-primary)]">
                    {fmtValue(val, metric.format)}
                  </span>
                  {showChange && (
                    <span
                      className={cn(
                        'font-mono text-xs',
                        change > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                      )}
                    >
                      {fmtChange(change, metric.format)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Props
interface PlatformDetailCardsProps {
  currentMetrics: SocialMonthlyMetrics[];
  previousMetrics: SocialMonthlyMetrics[];
  activeMonth: string;
}

const PLATFORMS: MetricsPlatform[] = ['TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X'];

export function PlatformDetailCards({
  currentMetrics,
  previousMetrics,
  activeMonth,
}: PlatformDetailCardsProps) {
  const [year, monthNum] = activeMonth.split('-');
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

  const activePlatforms = PLATFORMS.filter((p) =>
    currentMetrics.some((m) => m.platform === p)
  );

  if (activePlatforms.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        Henüz metrik verisi yok
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
        {monthLabel} — Platform Detayları
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {activePlatforms.map((platform) => (
          <PlatformCard
            key={platform}
            platform={platform}
            current={currentMetrics.find((m) => m.platform === platform)}
            previous={previousMetrics.find((m) => m.platform === platform)}
          />
        ))}
      </div>
    </div>
  );
}
