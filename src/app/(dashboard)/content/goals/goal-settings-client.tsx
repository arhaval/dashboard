'use client';

/**
 * GoalSettingsClient
 * Admin: haftalık hedef sayısını ayarlar (+ / - veya direkt sayı)
 */

import { useState, useTransition } from 'react';
import { updateGoalTarget } from './actions';
import { Loader2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentGoal, ContentPlatform } from '@/types';

const PLATFORM_LABEL: Record<ContentPlatform, string> = {
  YOUTUBE: 'YouTube',
  INSTAGRAM: 'Instagram',
  X: 'Twitter / X',
};

const SUBTYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video',
  SHORTS: 'Shorts',
  REELS: 'Reels',
  POST: 'Gönderi',
};

const PLATFORM_DOT: Record<ContentPlatform, string> = {
  YOUTUBE: 'bg-[#FF0000]',
  INSTAGRAM: 'bg-[#E1306C]',
  X: 'bg-[#000000]',
};

interface GoalSettingsClientProps {
  goals: ContentGoal[];
  isAdmin: boolean;
}

function GoalRow({ goal, isAdmin }: { goal: ContentGoal; isAdmin: boolean }) {
  const [value, setValue] = useState(goal.weekly_target);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = (newVal: number) => {
    if (newVal < 0) return;
    setValue(newVal);
    setSaved(false);
    startTransition(async () => {
      await updateGoalTarget(goal.id, newVal);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {SUBTYPE_LABEL[goal.sub_type]}
        </p>
        {saved && (
          <p className="text-[10px] text-[var(--color-success)]">Kaydedildi ✓</p>
        )}
      </div>

      {isAdmin ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => save(value - 1)}
            disabled={isPending || value <= 0}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>

          <input
            type="number"
            min={0}
            max={99}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            onBlur={() => save(value)}
            disabled={isPending}
            className={cn(
              'w-12 rounded-[var(--radius-sm)] border border-[var(--color-border)]',
              'bg-[var(--color-bg-secondary)] py-1 text-center text-sm font-bold tabular-nums',
              'text-[var(--color-text-primary)] outline-none',
              'focus:border-[var(--color-accent)] transition-colors'
            )}
          />

          <button
            onClick={() => save(value + 1)}
            disabled={isPending}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </button>

          <span className="text-xs text-[var(--color-text-muted)] w-12">/hafta</span>
        </div>
      ) : (
        <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
          {value}/hafta
        </span>
      )}
    </div>
  );
}

// Group goals by platform
function groupByPlatform(goals: ContentGoal[]) {
  const map: Record<string, ContentGoal[]> = {};
  for (const g of goals) {
    if (!map[g.platform]) map[g.platform] = [];
    map[g.platform].push(g);
  }
  return map;
}

export function GoalSettingsClient({ goals, isAdmin }: GoalSettingsClientProps) {
  const grouped = groupByPlatform(goals);

  return (
    <div className="space-y-5">
      {(Object.keys(grouped) as ContentPlatform[]).map((platform) => (
        <div key={platform}>
          <div className="mb-2 flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full', PLATFORM_DOT[platform])} />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {PLATFORM_LABEL[platform]}
            </p>
          </div>
          <div className="pl-4">
            {grouped[platform].map((goal) => (
              <GoalRow key={goal.id} goal={goal} isAdmin={isAdmin} />
            ))}
          </div>
        </div>
      ))}

      {!isAdmin && (
        <p className="text-center text-xs text-[var(--color-text-muted)] pt-2">
          Hedefleri değiştirmek için admin yetkisi gereklidir.
        </p>
      )}
    </div>
  );
}
