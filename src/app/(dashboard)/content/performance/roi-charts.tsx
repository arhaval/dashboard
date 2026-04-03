'use client';

/**
 * ROI Charts — İçerik üretim trendi
 * Bar: içerik sayısı (EDIT + VOICE ayrımıyla)
 * Line: platform görüntülemeleri (YouTube + Instagram)
 */

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendPoint {
  label: string;
  edit: number;
  voice: number;
  youtube: number;
  instagram: number;
}

interface RoiChartProps {
  data: TrendPoint[];
}

function formatViews(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 shadow-lg text-xs">
      <p className="mb-2 font-semibold text-[var(--color-text-primary)]">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-[var(--color-text-muted)]">{entry.name}</span>
          </div>
          <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
            {typeof entry.value === 'number' && entry.value > 100
              ? formatViews(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function RoiTrendChart({ data }: RoiChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        {/* Left: içerik sayısı */}
        <YAxis
          yAxisId="left"
          orientation="left"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          label={{
            value: 'İçerik',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 10, fill: 'var(--color-text-muted)' },
          }}
        />
        {/* Right: görüntüleme */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatViews}
          label={{
            value: 'Görüntüleme',
            angle: 90,
            position: 'insideRight',
            style: { fontSize: 10, fill: 'var(--color-text-muted)' },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8, color: 'var(--color-text-muted)' }}
        />
        <Bar
          yAxisId="left"
          dataKey="edit"
          name="Kurgu"
          stackId="content"
          fill="var(--color-success)"
          radius={[0, 0, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          yAxisId="left"
          dataKey="voice"
          name="Seslendirme"
          stackId="content"
          fill="var(--color-info)"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="youtube"
          name="YouTube"
          stroke="#FF0000"
          strokeWidth={2}
          dot={{ r: 3, fill: '#FF0000' }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="instagram"
          name="Instagram"
          stroke="#E1306C"
          strokeWidth={2}
          dot={{ r: 3, fill: '#E1306C' }}
          activeDot={{ r: 5 }}
          strokeDasharray="4 2"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
