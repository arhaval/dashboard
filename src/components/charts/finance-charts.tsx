'use client';

/**
 * Finance Charts
 * BarChart for monthly income/expense trend
 * DonutChart for category breakdown
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─────────────────────────────────────────────
// Monthly Trend Chart
// ─────────────────────────────────────────────

interface MonthlyTrendData {
  month: string; // e.g. "Nis" (short month label)
  income: number;
  expense: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
}

const formatK = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k₺`;
  return `${value}₺`;
};

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Yeterli veri yok
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%" barGap={4}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value.toLocaleString('tr-TR')}₺`,
            name === 'income' ? 'Gelir' : 'Gider',
          ]}
          contentStyle={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
          }}
          cursor={{ fill: 'var(--color-bg-tertiary)' }}
        />
        <Legend
          formatter={(value) => (value === 'income' ? 'Gelir' : 'Gider')}
          wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
        />
        <Bar
          dataKey="income"
          fill="var(--color-success)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="expense"
          fill="var(--color-error)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────
// Category Breakdown Donut
// ─────────────────────────────────────────────

const DONUT_COLORS = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-warning)',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#EC4899',
];

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryDonutProps {
  data: CategoryData[];
  total: number;
  label: string;
}

export function CategoryDonut({ data, total, label }: CategoryDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Veri yok
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="flex-shrink-0">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString('tr-TR')}₺`, '']}
              contentStyle={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        {data.slice(0, 5).map((item, index) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
                />
                <span className="truncate text-xs text-[var(--color-text-secondary)]">
                  {item.name}
                </span>
              </div>
              <span className="flex-shrink-0 text-xs font-medium text-[var(--color-text-primary)]">
                %{pct}
              </span>
            </div>
          );
        })}
        {data.length > 5 && (
          <p className="text-xs text-[var(--color-text-muted)]">+{data.length - 5} kategori daha</p>
        )}
      </div>
    </div>
  );
}
