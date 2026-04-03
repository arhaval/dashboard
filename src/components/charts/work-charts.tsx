'use client';

/**
 * Work Item Charts
 * Status funnel visualization & work type distribution donut
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// ─────────────────────────────────────────────
// Status Flow (DRAFT → APPROVED → PAID)
// ─────────────────────────────────────────────

interface StatusFlowProps {
  draft: number;
  approved: number;
  paid: number;
  total: number;
}

export function StatusFlow({ draft, approved, paid, total }: StatusFlowProps) {
  const stages = [
    {
      label: 'Taslak',
      value: draft,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-muted)',
    },
    {
      label: 'Onaylı',
      value: approved,
      color: 'var(--color-info)',
      bg: 'var(--color-info-muted)',
    },
    {
      label: 'Ödendi',
      value: paid,
      color: 'var(--color-success)',
      bg: 'var(--color-success-muted)',
    },
  ];

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const pct = total > 0 ? Math.round((stage.value / total) * 100) : 0;
        return (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">
                {stage.label}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: stage.color }}
              >
                {stage.value}
                <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">
                  (%{pct})
                </span>
              </span>
            </div>
            {/* Progress bar */}
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: stage.bg }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: stage.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Work Type Donut (STREAM / VOICE / EDIT)
// ─────────────────────────────────────────────

interface WorkTypeData {
  name: string;
  value: number;
  color: string;
}

interface WorkTypeDonutProps {
  stream: number;
  voice: number;
  edit: number;
}

export function WorkTypeDonut({ stream, voice, edit }: WorkTypeDonutProps) {
  const data: WorkTypeData[] = [
    { name: 'Yayın', value: stream, color: 'var(--color-accent)' },
    { name: 'Seslendirme', value: voice, color: 'var(--color-info)' },
    { name: 'Kurgu', value: edit, color: 'var(--color-success)' },
  ].filter((d) => d.value > 0);

  const total = stream + voice + edit;

  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Henüz iş kaydı yok
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={100} height={100}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={28}
            outerRadius={46}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [value, name]}
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

      <div className="space-y-2">
        {data.map((item) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <span className="text-xs text-[var(--color-text-secondary)]">
                {item.name}
              </span>
              <span className="ml-auto text-xs font-semibold text-[var(--color-text-primary)]">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
