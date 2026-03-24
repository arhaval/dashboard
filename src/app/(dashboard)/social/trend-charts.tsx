'use client';

/**
 * Trend Charts - Line charts showing platform metrics over last 6 months
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { getPlatformLabel, getPlatformBadgeClass } from '@/lib/utils';
import type { SocialMonthlyMetrics, MetricsPlatform } from '@/types';

interface TrendChartsProps {
  trendData: SocialMonthlyMetrics[];
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Oca',
  '02': 'Şub',
  '03': 'Mar',
  '04': 'Nis',
  '05': 'May',
  '06': 'Haz',
  '07': 'Tem',
  '08': 'Ağu',
  '09': 'Eyl',
  '10': 'Eki',
  '11': 'Kas',
  '12': 'Ara',
};

// Platform-specific main metric key
const MAIN_METRIC: Record<MetricsPlatform, { key: string; label: string }> = {
  TWITCH: { key: 'live_views', label: 'Canlı İzlenme' },
  YOUTUBE: { key: 'video_views', label: 'Video Görüntülenme' },
  INSTAGRAM: { key: 'views', label: 'Görüntülenme' },
  X: { key: 'impressions', label: 'Gösterim' },
};

function formatMonthLabel(month: string): string {
  const parts = month.split('-');
  return MONTH_LABELS[parts[1]] || parts[1];
}

function formatAxisNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

interface PlatformChartData {
  monthLabel: string;
  followers: number;
  mainMetric: number;
}

function buildPlatformData(
  trendData: SocialMonthlyMetrics[],
  platform: MetricsPlatform
): PlatformChartData[] {
  const platformData = trendData
    .filter((m) => m.platform === platform)
    .sort((a, b) => a.month.localeCompare(b.month));

  const metricKey = MAIN_METRIC[platform].key;

  return platformData.map((m) => ({
    monthLabel: formatMonthLabel(m.month),
    followers: m.followers_total || 0,
    mainMetric: (m[metricKey as keyof SocialMonthlyMetrics] as number) || 0,
  }));
}

const PLATFORMS: MetricsPlatform[] = ['TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X'];

export function TrendCharts({ trendData }: TrendChartsProps) {
  if (trendData.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
        <h3 className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">
          Trend Grafikleri
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Henüz yeterli veri yok. En az 2 aylık veri girildiğinde grafikler görünecek.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
        Trend Grafikleri (Son 6 Ay)
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map((platform) => {
          const data = buildPlatformData(trendData, platform);
          if (data.length === 0) return null;

          return (
            <div
              key={platform}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                    getPlatformBadgeClass(platform)
                  )}
                >
                  {getPlatformLabel(platform)}
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fill: '#A1A1A1', fontSize: 11 }}
                      axisLine={{ stroke: '#2A2A2A' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#A1A1A1', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatAxisNumber}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F1F1F',
                        border: '1px solid #2A2A2A',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#FAFAFA' }}
                      formatter={(value: unknown, name: unknown) => [
                        (typeof value === 'number' ? value : 0).toLocaleString('tr-TR'),
                        (String(name || '')) === 'followers' ? 'Takipçi' : MAIN_METRIC[platform].label,
                      ]}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === 'followers' ? 'Takipçi' : MAIN_METRIC[platform].label
                      }
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="#FF4D00"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#FF4D00' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mainMetric"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3B82F6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
