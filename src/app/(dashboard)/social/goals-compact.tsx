/**
 * Genel Bakış'ın en altında küçük hedef şeridi.
 *
 * Hedef EKLEME/DÜZENLEME burada değil: o bir yönetim işi ve Veri Merkezi'ne
 * ait. Burada yalnızca "hedefe ne kadar yaklaştım" görünür.
 */

import Link from 'next/link';
import { Target } from 'lucide-react';
import { getPlatformLabel } from '@/lib/utils';
import { compact } from './social-overview.constants';
import { monthLabel } from './social-monthly.constants';
import type { GoalProgress } from '@/types';

/** Ekranı uzatmamak için gösterilen en fazla hedef sayısı. */
const MAX_VISIBLE = 4;

export function GoalsCompact({ month, goals }: { month: string; goals: GoalProgress[] }) {
  const visible = goals.slice(0, MAX_VISIBLE);
  const hidden = goals.length - visible.length;

  return (
    <section
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          <Target className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />
          {monthLabel(month)} Hedefleri
        </h3>
        <Link
          href={`/social/data?month=${month}#hedefler`}
          className="text-[11.5px] font-semibold"
          style={{ color: 'var(--color-accent)' }}
        >
          {goals.length === 0 ? 'Hedef Ekle' : 'Hedefleri Düzenle'}
        </Link>
      </div>

      {goals.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          Bu ay için hedef belirlenmemiş.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((g) => (
            <div key={`${g.platform}-${g.metric_key}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11.5px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {getPlatformLabel(g.platform)} · {g.metric_label}
                </span>
                <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  %{Math.round(g.percentage)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full" style={{ backgroundColor: 'var(--color-surface-sunken)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(g.percentage, 100)}%`,
                    backgroundColor: g.percentage >= 100 ? 'var(--color-success)' : 'var(--color-accent)',
                  }}
                />
              </div>
              <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {compact(g.actual)} → {compact(g.target)}
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
    </section>
  );
}
