'use client';

/**
 * ANALİZ — tek grafik, üç seçici.
 *
 * Eskiden 5-6 platform grafiği alt alta diziliyordu: ekran uzuyordu, hiçbiri
 * yeterince büyük değildi ve karşılaştırma yapmak imkânsızdı. Artık tek büyük
 * grafik var; ne göstereceğini kullanıcı seçiyor.
 *
 * Salt okunur: düzenleme/silme burada yok, onlar Veri Merkezi'ne ait.
 */

import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Amount, Figure, MicroLabel, PlatformTag } from '../social-ui';
import {
  ANALYTICS_METRICS,
  MONTHLY_PLATFORMS,
  MONTHLY_PLATFORM_LABELS,
  monthLabel,
  readMetric,
  type MonthlyPlatform,
} from '../social-monthly.constants';
import { compact, full } from '../social-overview.constants';

type Range = '6' | '12' | 'YEAR';

const RANGES: { id: Range; label: string }[] = [
  { id: '6', label: 'Son 6 Ay' },
  { id: '12', label: 'Son 12 Ay' },
  { id: 'YEAR', label: 'Bu Yıl' },
];

const MONTH_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function shortLabel(month: string): string {
  const [, m] = month.split('-').map(Number);
  return MONTH_SHORT[m - 1] ?? month;
}

export type MetricRow = { month: string; platform: string; [column: string]: unknown };

export function AnalyticsExplorer({ rows, currentYear }: { rows: MetricRow[]; currentYear: number }) {
  const [platform, setPlatform] = useState<MonthlyPlatform>('INSTAGRAM');
  const [range, setRange] = useState<Range>('12');

  const metrics = ANALYTICS_METRICS[platform];
  const [metricKey, setMetricKey] = useState<string>(metrics[0].key);

  // Platform değişince metrik o platformda yoksa ilkine düşer — render
  // sırasında türetiliyor, efekt gerekmiyor.
  const activeMetric = metrics.find((m) => m.key === metricKey) ?? metrics[0];

  const series = useMemo(() => {
    const platformRows = rows
      .filter((r) => r.platform === platform)
      .sort((a, b) => a.month.localeCompare(b.month));

    const scoped =
      range === 'YEAR'
        ? platformRows.filter((r) => r.month.startsWith(String(currentYear)))
        : platformRows.slice(-Number(range));

    return scoped.map((r) => ({
      month: r.month,
      label: shortLabel(r.month),
      value: readMetric(r, platform, activeMetric.key),
    }));
  }, [rows, platform, range, activeMetric.key, currentYear]);

  const withData = series.filter((p) => p.value != null);
  const latest = withData[withData.length - 1]?.value ?? null;
  const first = withData[0]?.value ?? null;
  const changePct = first != null && latest != null && first > 0
    ? Math.round(((latest - first) / first) * 100)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Platform seçici */}
      <div className="flex flex-wrap gap-1.5">
        {MONTHLY_PLATFORMS.map((p) => {
          const active = p === platform;
          return (
            <button
              key={p}
              onClick={() => {
                setPlatform(p);
                setMetricKey(ANALYTICS_METRICS[p][0].key);
              }}
              className="rounded-[var(--radius-sm)] px-2.5 py-1.5 transition-colors"
              style={active
                ? { backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-hover)' }
                : { border: '1px solid transparent' }}
            >
              <PlatformTag platform={p} muted={!active} strong={active} />
            </button>
          );
        })}
      </div>

      {/* Aralık + metrik */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          value={range}
          onChange={(v) => setRange(v as Range)}
        />
        <span className="mx-1 hidden h-4 w-px sm:block" style={{ backgroundColor: 'var(--color-border)' }} />
        <Segmented
          options={metrics.map((m) => ({ id: m.key, label: m.label }))}
          value={activeMetric.key}
          onChange={setMetricKey}
        />
      </div>

      {/* Tek büyük grafik */}
      <section
        className="rounded-[var(--radius-md)] p-4"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel>{MONTHLY_PLATFORM_LABELS[platform]} · {activeMetric.label}</MicroLabel>
            <div className="mt-1.5">
              <Amount tone={latest == null ? 'var(--color-text-muted)' : undefined}>
                {latest == null ? '—' : full(latest)}
              </Amount>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              son ay
            </p>
          </div>
          {changePct != null && (
            <span title="Seçili aralığın başından sonuna değişim">
              <Figure tone={changePct >= 0 ? 'var(--color-success)' : 'var(--color-error)'}>
                {changePct >= 0 ? '+' : ''}{changePct}%
              </Figure>
              <span className="ml-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>aralık boyunca</span>
            </span>
          )}
        </div>

        {withData.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Bu aralıkta {MONTHLY_PLATFORM_LABELS[platform]} için {activeMetric.label.toLocaleLowerCase('tr')} verisi yok.
          </p>
        ) : (
          <div className="h-[300px] sm:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v: number) => compact(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                  formatter={(v: unknown) => [typeof v === 'number' ? full(v) : '—', activeMetric.label]}
                />
                {/* connectNulls=false: veri girilmemiş ay çizgide boşluk olarak
                    kalır — düz çizgiyle doldurmak "veri var" izlenimi verirdi. */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color-accent)' }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <ComparisonTable rows={rows} platform={platform} months={series.map((s) => s.month)} />
    </div>
  );
}

// ── Aylık karşılaştırma tablosu ─────────────────────────────────────────────

function ComparisonTable({
  rows,
  platform,
  months,
}: {
  rows: MetricRow[];
  platform: MonthlyPlatform;
  months: string[];
}) {
  const metrics = ANALYTICS_METRICS[platform];
  const byMonth = useMemo(() => {
    const m = new Map<string, MetricRow>();
    for (const r of rows) if (r.platform === platform) m.set(r.month, r);
    return m;
  }, [rows, platform]);

  // En yeniden eskiye — okurken son ay üstte olsun.
  const ordered = [...months].reverse();
  if (ordered.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-md)]"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th
                className="px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Ay
              </th>
              {metrics.map((m) => (
                <th
                  key={m.key}
                  className="px-3.5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((month, i) => (
              <tr
                key={month}
                style={{
                  backgroundColor: i % 2 ? 'var(--color-table-row-even)' : 'var(--color-table-row-odd)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <td className="px-3.5 py-2 text-[12.5px]" style={{ color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                  {monthLabel(month)}
                </td>
                {metrics.map((m) => {
                  const value = readMetric(byMonth.get(month), platform, m.key);
                  return (
                    <td key={m.key} className="px-3.5 py-2 text-right">
                      <Figure tone={value == null ? 'var(--color-text-muted)' : undefined}>
                        {value == null ? '—' : full(value)}
                      </Figure>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Ortak segment seçici ────────────────────────────────────────────────────

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-0.5 rounded-[var(--radius-md)] p-0.5"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
            style={active
              ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
              : { color: 'var(--color-text-secondary)' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
