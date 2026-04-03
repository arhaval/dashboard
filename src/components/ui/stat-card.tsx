/**
 * StatCard Component
 * YZEN-style metric card with colored icon box and optional change badge.
 * Used on dashboard and summary pages.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

// Predefined icon box color themes
export type StatCardColor =
  | 'orange'
  | 'blue'
  | 'green'
  | 'purple'
  | 'red'
  | 'teal'
  | 'yellow';

const colorMap: Record<
  StatCardColor,
  { box: string; icon: string }
> = {
  orange: {
    box: 'bg-[var(--color-accent-muted)]',
    icon: 'text-[var(--color-accent)]',
  },
  blue: {
    box: 'bg-[var(--color-info-muted)]',
    icon: 'text-[var(--color-info)]',
  },
  green: {
    box: 'bg-[var(--color-success-muted)]',
    icon: 'text-[var(--color-success)]',
  },
  purple: {
    box: 'bg-[rgba(139,92,246,0.12)]',
    icon: 'text-[#8B5CF6]',
  },
  red: {
    box: 'bg-[var(--color-error-muted)]',
    icon: 'text-[var(--color-error)]',
  },
  teal: {
    box: 'bg-[rgba(20,184,166,0.12)]',
    icon: 'text-[#14B8A6]',
  },
  yellow: {
    box: 'bg-[var(--color-warning-muted)]',
    icon: 'text-[var(--color-warning)]',
  },
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
  /** Icon box color theme */
  color?: StatCardColor;
  /**
   * Change indicator — positive or negative
   * e.g. { value: '+12%', positive: true }
   */
  change?: {
    value: string;
    positive: boolean;
  };
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
  const theme = colorMap[color];

  return (
    <Card className={cn('p-5', className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between">
          {/* Left: value and title */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              {title}
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {value}
            </p>
            {(description || change) && (
              <div className="mt-1.5 flex items-center gap-2">
                {change && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      change.positive
                        ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                        : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
                    )}
                  >
                    {change.positive ? '▲' : '▼'} {change.value}
                  </span>
                )}
                {description && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: colored icon box */}
          <div
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-lg)]',
              theme.box
            )}
          >
            <Icon className={cn('h-5 w-5', theme.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
