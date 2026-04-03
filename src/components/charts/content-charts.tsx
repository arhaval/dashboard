'use client';

/**
 * Content Production Charts
 * Line chart for monthly trend + bar chart for team performance
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

// ─────────────────────────────────────────────
// Monthly Content Trend (Line Chart)
// ─────────────────────────────────────────────

interface ContentTrendPoint {
  label: string;
  voice: number;
  edit: number;
  total: number;
}

export function ContentTrendChart({ data }: { data: ContentTrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Henüz içerik verisi yok
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
          }}
          formatter={(value: number, name: string) => [
            value,
            name === 'voice' ? 'Seslendirme' : name === 'edit' ? 'Kurgu' : 'Toplam',
          ]}
        />
        <Legend
          formatter={(v) => v === 'voice' ? 'Seslendirme' : v === 'edit' ? 'Kurgu' : 'Toplam'}
          wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          dot={{ fill: 'var(--color-accent)', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="voice"
          stroke="var(--color-info)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="edit"
          stroke="var(--color-success)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────
// Team Content Performance (Horizontal Bar)
// ─────────────────────────────────────────────

interface TeamContentEntry {
  name: string;
  voice: number;
  edit: number;
  total: number;
}

export function TeamContentChart({ data }: { data: TeamContentEntry[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Bu ay henüz içerik yok
      </div>
    );
  }

  // Show max 6 users
  const displayData = data.slice(0, 6);
  const maxTotal = Math.max(...displayData.map((d) => d.total), 1);

  return (
    <div className="space-y-3">
      {displayData.map((entry, idx) => {
        const voicePct = (entry.voice / maxTotal) * 100;
        const editPct = (entry.edit / maxTotal) * 100;
        return (
          <div key={entry.name}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: idx === 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                {entry.voice > 0 && (
                  <span className="text-[var(--color-info)]">🎙 {entry.voice}</span>
                )}
                {entry.edit > 0 && (
                  <span className="text-[var(--color-success)]">✂️ {entry.edit}</span>
                )}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {entry.total} içerik
                </span>
              </div>
            </div>
            {/* Stacked progress bar */}
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${voicePct}%`, background: 'var(--color-info)' }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${editPct}%`, background: 'var(--color-success)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
