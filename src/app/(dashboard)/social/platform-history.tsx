'use client';

/**
 * Platform History Component
 * Shows monthly history for a selected platform
 */

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { MetricsPlatform, SocialMonthlyMetrics } from '@/types';

const PLATFORM_OPTIONS: { value: MetricsPlatform | ''; label: string }[] = [
  { value: '', label: 'Select a platform...' },
  { value: 'TWITCH', label: 'Twitch' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'X (Twitter)' },
];

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

// Get display columns based on platform
function getColumns(platform: MetricsPlatform): { key: string; label: string }[] {
  const base = [{ key: 'month', label: 'Month' }];

  switch (platform) {
    case 'TWITCH':
      return [
        ...base,
        { key: 'followers_total', label: 'Followers' },
        { key: 'live_views', label: 'Live Views' },
        { key: 'avg_viewers', label: 'Avg Viewers' },
        { key: 'peak_viewers', label: 'Peak Viewers' },
        { key: 'unique_chatters', label: 'Chatters' },
        { key: 'subs_total', label: 'Subs' },
      ];
    case 'YOUTUBE':
      return [
        ...base,
        { key: 'subscribers_total', label: 'Subscribers' },
        { key: 'video_views', label: 'Video Views' },
        { key: 'shorts_views', label: 'Shorts Views' },
        { key: 'live_views', label: 'Live Views' },
        { key: 'total_likes', label: 'Likes' },
        { key: 'total_comments', label: 'Comments' },
      ];
    case 'INSTAGRAM':
      return [
        ...base,
        { key: 'followers_total', label: 'Followers' },
        { key: 'views', label: 'Views' },
        { key: 'likes', label: 'Likes' },
        { key: 'comments', label: 'Comments' },
        { key: 'saves', label: 'Saves' },
        { key: 'shares', label: 'Shares' },
      ];
    case 'X':
      return [
        ...base,
        { key: 'followers_total', label: 'Followers' },
        { key: 'impressions', label: 'Impressions' },
        { key: 'engagement_rate', label: 'Eng. Rate' },
        { key: 'likes', label: 'Likes' },
        { key: 'replies', label: 'Replies' },
        { key: 'profile_visits', label: 'Profile Visits' },
      ];
    default:
      return base;
  }
}

export function PlatformHistory() {
  const [platform, setPlatform] = useState<MetricsPlatform | ''>('');
  const [history, setHistory] = useState<SocialMonthlyMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!platform) {
      setHistory([]);
      return;
    }

    setLoading(true);

    // Fetch history via API
    fetch(`/api/social-metrics/history?platform=${platform}`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.metrics || []);
      })
      .catch((err) => {
        console.error('Failed to fetch history:', err);
        setHistory([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [platform]);

  const columns = platform ? getColumns(platform) : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Platform History
        </h3>
        <Select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as MetricsPlatform | '')}
          className="w-48"
        >
          {PLATFORM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {!platform && (
        <div className="flex h-32 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
          Select a platform to view history
        </div>
      )}

      {platform && loading && (
        <div className="flex h-32 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
          Loading...
        </div>
      )}

      {platform && !loading && history.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
          No history data for {platform}
        </div>
      )}

      {platform && !loading && history.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]',
                      col.key === 'month' ? 'text-left' : 'text-right'
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-[var(--color-border)] last:border-b-0',
                    index % 2 === 0
                      ? 'bg-[var(--color-table-row-even)]'
                      : 'bg-[var(--color-table-row-odd)]'
                  )}
                >
                  {columns.map((col) => {
                    const rowData = row as unknown as Record<string, unknown>;
                    const value =
                      col.key === 'month'
                        ? formatMonth(row.month)
                        : col.key === 'engagement_rate'
                        ? `${rowData[col.key] || 0}%`
                        : formatNumber((rowData[col.key] as number) || 0);

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-sm',
                          col.key === 'month'
                            ? 'text-left text-[var(--color-text-primary)]'
                            : 'text-right font-mono text-[var(--color-text-primary)]'
                        )}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
