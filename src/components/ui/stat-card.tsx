/**
 * StatCard Component
 * Tessera tarzı metrik kartı: etiket · sağ üstte renkli ikon · büyük rakam ·
 * trend satırı. Dashboard ve özet sayfalarında kullanılır.
 */

import * as React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// İkon rengi temaları (eski adlar korunuyor — çağıran sayfalar değişmesin)
export type StatCardColor = 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'teal' | 'yellow';

const ICON_COLOR: Record<StatCardColor, string> = {
  orange: 'var(--color-accent)',
  blue: 'var(--color-info)',
  green: 'var(--color-success)',
  purple: 'var(--color-purple)',
  red: 'var(--color-error)',
  teal: 'var(--color-info)',
  yellow: 'var(--color-warning)',
};

export interface StatCardProps {
  /** Card title/label */
  title: string;
  /** Primary metric value */
  value: string;
  /** Secondary description below value */
  description?: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Icon color theme */
  color?: StatCardColor;
  /** Change indicator, e.g. { value: '+12%', positive: true } */
  change?: { value: string; positive: boolean };
  /** Optional extra class names */
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'orange',
  change,
  className,
}: StatCardProps) {
  const TrendIcon = change?.positive === false ? TrendingDown : TrendingUp;
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-[var(--color-text-secondary)]">{title}</p>
        <Icon className="h-5 w-5 flex-shrink-0" style={{ color: ICON_COLOR[color] }} />
      </div>
      <p className="mt-5 truncate text-[28px] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
      {(change || description) && (
        <p className="mt-2.5 flex items-center gap-1.5 truncate text-xs">
          {change && (
            <span
              className="flex items-center gap-1 font-medium"
              style={{ color: change.positive ? 'var(--color-success)' : 'var(--color-error)' }}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {change.value}
            </span>
          )}
          {description && <span className="text-[var(--color-text-muted)]">{description}</span>}
        </p>
      )}
    </div>
  );
}
