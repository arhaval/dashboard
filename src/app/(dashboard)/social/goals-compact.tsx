/**
 * Genel Bakış'ın en altında küçük hedef şeridi.
 *
 * Hedef EKLEME/DÜZENLEME burada değil: o bir yönetim işi ve Veri Merkezi'ne
 * ait. Burada yalnızca "hedefe ne kadar yaklaştım" görünür.
 */

import Link from 'next/link';
import { compact } from './social-overview.constants';
import { monthLabel, type MonthlyPlatform } from './social-monthly.constants';
import { Figure, PlatformTag, Section } from './social-ui';
import type { GoalProgress } from '@/types';

/** Ekranı uzatmamak için gösterilen en fazla hedef sayısı. */
const MAX_VISIBLE = 4;

export function GoalsCompact({ month, goals }: { month: string; goals: GoalProgress[] }) {
  const visible = goals.slice(0, MAX_VISIBLE);
  const hidden = goals.length - visible.length;

  return (
    <Section
      title={`${monthLabel(month)} Hedefleri`}
      action={
        <Link href={`/social/data?month=${month}#hedefler`} className="text-[11px] font-semibold" style={{ color: 'var(--color-accent)' }}>
          {goals.length === 0 ? 'Hedef Ekle' : 'Düzenle'}
        </Link>
      }
    >
      {goals.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          Bu ay için hedef belirlenmemiş.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((g) => (
            <div key={`${g.platform}-${g.metric_key}`}>
              <div className="flex items-baseline justify-between gap-2">
                <PlatformTag platform={g.platform as MonthlyPlatform} />
                <Figure tone={g.percentage >= 100 ? 'var(--color-success)' : 'var(--color-text-muted)'}>
                  %{Math.round(g.percentage)}
                </Figure>
              </div>
              <div className="mt-1.5 h-1 w-full rounded-full" style={{ backgroundColor: 'var(--color-surface-sunken)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(g.percentage, 100)}%`,
                    backgroundColor: g.percentage >= 100 ? 'var(--color-success)' : 'var(--color-accent)',
                  }}
                />
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {g.metric_label} · <Figure tone="var(--color-text-muted)">{compact(g.actual)} → {compact(g.target)}</Figure>
              </p>
            </div>
          ))}
        </div>
      )}

      {hidden > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          +{hidden} hedef daha — Veri Merkezi sayfasında.
        </p>
      )}
    </Section>
  );
}
