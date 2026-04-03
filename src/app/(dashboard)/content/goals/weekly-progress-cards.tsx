'use client';

/**
 * WeeklyProgressCards
 * Platform + alt tür bazlı bu haftanın ilerleme barları
 */

import { cn } from '@/lib/utils';
import type { WeeklyGoalProgress, ContentPlatform } from '@/types';

const PLATFORM_CONFIG: Record<ContentPlatform, { label: string; color: string; bg: string }> = {
  YOUTUBE: { label: 'YouTube', color: '#FF0000', bg: 'bg-red-50' },
  INSTAGRAM: { label: 'Instagram', color: '#E1306C', bg: 'bg-pink-50' },
  X: { label: 'Twitter / X', color: '#000000', bg: 'bg-gray-50' },
};

const SUBTYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video',
  SHORTS: 'Shorts',
  REELS: 'Reels',
  POST: 'Gönderi',
};

interface WeeklyProgressCardsProps {
  progress: WeeklyGoalProgress[];
}

// Group by platform
function groupByPlatform(progress: WeeklyGoalProgress[]) {
  const map: Record<string, WeeklyGoalProgress[]> = {};
  for (const item of progress) {
    if (!map[item.platform]) map[item.platform] = [];
    map[item.platform].push(item);
  }
  return map;
}

export function WeeklyProgressCards({ progress }: WeeklyProgressCardsProps) {
  const grouped = groupByPlatform(progress);

  if (progress.every((p) => p.weekly_target === 0)) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-3xl">🎯</span>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Henüz hedef belirlenmemiş
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Sağ taraftaki formdan haftalık hedeflerini ayarla
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(Object.keys(grouped) as ContentPlatform[]).map((platform) => {
        const config = PLATFORM_CONFIG[platform];
        const items = grouped[platform].filter((i) => i.weekly_target > 0);
        if (items.length === 0) return null;

        return (
          <div key={platform}>
            {/* Platform header */}
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {config.label}
              </p>
            </div>

            {/* Items */}
            <div className="space-y-4 pl-5">
              {items.map((item) => {
                const overTarget = item.done_this_week > item.weekly_target;
                return (
                  <div key={`${item.platform}-${item.sub_type}`}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {SUBTYPE_LABEL[item.sub_type]}
                        </span>
                        {item.on_track && (
                          <span className="rounded-full bg-[var(--color-success-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                            ✓ Tamam
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-sm font-bold tabular-nums',
                            item.on_track
                              ? 'text-[var(--color-success)]'
                              : item.done_this_week > 0
                                ? 'text-[var(--color-warning)]'
                                : 'text-[var(--color-text-muted)]'
                          )}
                        >
                          {item.done_this_week}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          / {item.weekly_target}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          item.on_track
                            ? 'bg-[var(--color-success)]'
                            : item.done_this_week > 0
                              ? 'bg-[var(--color-warning)]'
                              : 'bg-[var(--color-border)]'
                        )}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>

                    <p className="mt-0.5 text-right text-[10px] text-[var(--color-text-muted)]">
                      {overTarget
                        ? `Hedefi ${item.done_this_week - item.weekly_target} aştı 🎉`
                        : item.weekly_target - item.done_this_week > 0
                          ? `${item.weekly_target - item.done_this_week} kaldı`
                          : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
