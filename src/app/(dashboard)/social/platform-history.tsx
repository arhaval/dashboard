'use client';

/**
 * Platform History Component
 * Shows monthly history for a selected platform
 */

import { useState, useEffect, useCallback } from 'react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { SocialMetricDeleteButton } from './delete-button';
import type { MetricsPlatform, SocialMonthlyMetrics } from '@/types';

const PLATFORM_OPTIONS: { value: MetricsPlatform | ''; label: string }[] = [
  { value: '', label: 'Platform seçin...' },
  { value: 'TWITCH', label: tr.social.platforms.TWITCH },
  { value: 'YOUTUBE', label: tr.social.platforms.YOUTUBE },
  { value: 'INSTAGRAM', label: tr.social.platforms.INSTAGRAM },
  { value: 'X', label: tr.social.platforms.X },
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
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
}

// Get display columns based on platform
function getColumns(platform: MetricsPlatform): { key: string; label: string }[] {
  const base = [{ key: 'month', label: tr.social.fields.month }];

  switch (platform) {
    case 'TWITCH':
      return [
        ...base,
        { key: 'followers_total', label: tr.social.fields.followers },
        { key: 'live_views', label: 'Canlı İzlenme' },
        { key: 'avg_viewers', label: tr.social.fields.avgViewers },
        { key: 'peak_viewers', label: tr.social.fields.peakViewers },
        { key: 'unique_chatters', label: 'Sohbet' },
        { key: 'subs_total', label: tr.social.fields.subscribers },
      ];
    case 'YOUTUBE':
      return [
        ...base,
        { key: 'subscribers_total', label: tr.social.fields.subscribers },
        { key: 'video_views', label: 'Video İzlenme' },
        { key: 'shorts_views', label: 'Shorts İzlenme' },
        { key: 'live_views', label: 'Canlı İzlenme' },
        { key: 'total_likes', label: 'Beğeni' },
        { key: 'total_comments', label: 'Yorum' },
      ];
    case 'INSTAGRAM':
      return [
        ...base,
        { key: 'followers_total', label: tr.social.fields.followers },
        { key: 'views', label: tr.social.fields.views },
        { key: 'likes', label: 'Beğeni' },
        { key: 'comments', label: 'Yorum' },
        { key: 'saves', label: 'Kaydetme' },
        { key: 'shares', label: 'Paylaşım' },
      ];
    case 'X':
      return [
        ...base,
        { key: 'followers_total', label: tr.social.fields.followers },
        { key: 'impressions', label: 'Gösterim' },
        { key: 'engagement_rate', label: 'Etkileşim %' },
        { key: 'likes', label: 'Beğeni' },
        { key: 'replies', label: 'Yanıt' },
        { key: 'profile_visits', label: 'Profil Ziyareti' },
      ];
    default:
      return base;
  }
}

export function PlatformHistory() {
  const [platform, setPlatform] = useState<MetricsPlatform | ''>('');
  const [history, setHistory] = useState<SocialMonthlyMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback((selectedPlatform: MetricsPlatform) => {
    setLoading(true);
    fetch(`/api/social-metrics/history?platform=${selectedPlatform}`)
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
  }, []);

  useEffect(() => {
    if (!platform) {
      setHistory([]);
      return;
    }
    fetchHistory(platform);
  }, [platform, fetchHistory]);

  const handleDeleted = () => {
    if (platform) {
      fetchHistory(platform);
    }
  };

  const columns = platform ? getColumns(platform) : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Platform Geçmişi
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
          Geçmişi görüntülemek için platform seçin
        </div>
      )}

      {platform && loading && (
        <div className="flex h-32 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
          {tr.table.loading}
        </div>
      )}

      {platform && !loading && history.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
          {platform} için geçmiş verisi bulunamadı
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
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                  {tr.table.actions}
                </th>
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
                  <td className="px-4 py-3 text-right">
                    <SocialMetricDeleteButton
                      metricId={row.id}
                      onDeleted={handleDeleted}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
