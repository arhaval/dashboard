'use client';

/**
 * CalendarGrid — Aylık takvim görünümü
 * Shows content plans as colored chips on each day cell.
 */

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { updateContentPlanStatus, deleteContentPlan } from './actions';
import { Check, Loader2, Trash2, Clock, PlayCircle } from 'lucide-react';
import type { ContentPlan } from '@/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const TYPE_STYLES: Record<string, { chip: string; dot: string; label: string }> = {
  VOICE: {
    chip: 'bg-[var(--color-info-muted)] text-[var(--color-info)] border-[var(--color-info)]/20',
    dot: 'bg-[var(--color-info)]',
    label: 'Seslendirme',
  },
  EDIT: {
    chip: 'bg-[var(--color-success-muted)] text-[var(--color-success)] border-[var(--color-success)]/20',
    dot: 'bg-[var(--color-success)]',
    label: 'Kurgu',
  },
  STREAM: {
    chip: 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/20',
    dot: 'bg-[var(--color-accent)]',
    label: 'Yayın',
  },
};

const STATUS_OVERLAY: Record<string, string> = {
  DONE: 'opacity-60 line-through',
  CANCELLED: 'opacity-40 line-through',
  IN_PROGRESS: 'ring-1 ring-[var(--color-warning)]',
};

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-[var(--color-error)]',
  HIGH: 'bg-[var(--color-warning)]',
  NORMAL: 'bg-[var(--color-text-muted)]',
  LOW: 'bg-[var(--color-border)]',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun, return Mon-based (Mon=0)
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

// ─────────────────────────────────────────────
// Plan Chip
// ─────────────────────────────────────────────

interface PlanChipProps {
  plan: ContentPlan;
  isAdmin: boolean;
}

function PlanChip({ plan, isAdmin }: PlanChipProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const typeStyle = TYPE_STYLES[plan.content_type] ?? TYPE_STYLES.VOICE;

  const handleStatus = (status: 'DONE' | 'IN_PROGRESS' | 'PLANNED' | 'CANCELLED') => {
    startTransition(async () => {
      await updateContentPlanStatus(plan.id, status);
      setExpanded(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteContentPlan(plan.id);
      setExpanded(false);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border',
          'transition-all duration-150',
          typeStyle.chip,
          STATUS_OVERLAY[plan.status] ?? '',
          isPending && 'opacity-50 pointer-events-none'
        )}
      >
        {isPending ? (
          <Loader2 className="inline h-2.5 w-2.5 animate-spin" />
        ) : plan.status === 'DONE' ? (
          <Check className="inline h-2.5 w-2.5 mr-0.5" />
        ) : null}
        {plan.title}
      </button>

      {/* Popup */}
      {expanded && (
        <div
          className={cn(
            'absolute z-50 left-0 top-full mt-1',
            'w-52 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
            'bg-[var(--color-bg-secondary)] p-3',
            'shadow-lg'
          )}
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          {/* Title + type */}
          <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">
            {plan.title}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                typeStyle.chip
              )}
            >
              {typeStyle.label}
            </span>
            {plan.priority !== 'NORMAL' && (
              <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[plan.priority])} />
            )}
          </div>

          {plan.assignee && (
            <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
              👤 {plan.assignee.full_name}
            </p>
          )}
          {plan.notes && (
            <p className="text-[10px] text-[var(--color-text-secondary)] mb-2 border-t border-[var(--color-border)] pt-2">
              {plan.notes}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-1 border-t border-[var(--color-border)] pt-2">
            {plan.status !== 'DONE' && (
              <button
                onClick={() => handleStatus('DONE')}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-success-muted)] text-[var(--color-success)] hover:opacity-80"
              >
                <Check className="h-2.5 w-2.5" /> Tamamla
              </button>
            )}
            {plan.status === 'PLANNED' && (
              <button
                onClick={() => handleStatus('IN_PROGRESS')}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-warning-muted)] text-[var(--color-warning)] hover:opacity-80"
              >
                <PlayCircle className="h-2.5 w-2.5" /> Başladı
              </button>
            )}
            {plan.status === 'DONE' && (
              <button
                onClick={() => handleStatus('PLANNED')}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:opacity-80"
              >
                <Clock className="h-2.5 w-2.5" /> Geri Al
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-error-muted)] text-[var(--color-error)] hover:opacity-80"
              >
                <Trash2 className="h-2.5 w-2.5" /> Sil
              </button>
            )}
          </div>
          {/* Close */}
          <button
            onClick={() => setExpanded(false)}
            className="absolute right-2 top-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Calendar Grid
// ─────────────────────────────────────────────

interface CalendarGridProps {
  plans: ContentPlan[];
  month: string; // YYYY-MM
  isAdmin: boolean;
  onDayClick?: (date: string) => void;
}

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function CalendarGrid({ plans, month, isAdmin, onDayClick }: CalendarGridProps) {
  const [year, m] = month.split('-').map(Number);
  const totalDays = getDaysInMonth(year, m);
  const firstDay = getFirstDayOfMonth(year, m);
  const today = new Date().toISOString().slice(0, 10);

  // Group plans by date
  const plansByDate = new Map<string, ContentPlan[]>();
  for (const plan of plans) {
    const key = plan.planned_date;
    plansByDate.set(key, [...(plansByDate.get(key) ?? []), plan]);
  }

  // Build grid cells
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, day: d });
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });

  return (
    <div>
      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[80px] rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]/40"
              />
            );
          }

          const dayPlans = plansByDate.get(cell.date) ?? [];
          const isToday = cell.date === today;
          const isPast = cell.date < today;
          const hasOverdue = dayPlans.some(
            (p) => (p.status === 'PLANNED' || p.status === 'IN_PROGRESS') && isPast
          );

          return (
            <div
              key={cell.date}
              className={cn(
                'min-h-[80px] rounded-[var(--radius-md)] border p-1.5 transition-colors',
                isToday
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                  : hasOverdue
                    ? 'border-[var(--color-error)]/30 bg-[var(--color-error-muted)]/30'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
                isAdmin && 'cursor-pointer hover:border-[var(--color-accent)]/50'
              )}
              onClick={() => isAdmin && onDayClick?.(cell.date!)}
            >
              {/* Day number */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
                    isToday
                      ? 'bg-[var(--color-accent)] text-white'
                      : isPast
                        ? 'text-[var(--color-text-muted)]'
                        : 'text-[var(--color-text-secondary)]'
                  )}
                >
                  {cell.day}
                </span>
                {dayPlans.length > 0 && (
                  <span className="text-[9px] text-[var(--color-text-muted)]">
                    {dayPlans.filter((p) => p.status === 'DONE').length}/{dayPlans.length}
                  </span>
                )}
              </div>

              {/* Plan chips */}
              <div className="space-y-0.5">
                {dayPlans.slice(0, 3).map((plan) => (
                  <PlanChip key={plan.id} plan={plan} isAdmin={isAdmin} />
                ))}
                {dayPlans.length > 3 && (
                  <p className="text-[9px] text-[var(--color-text-muted)] pl-1">
                    +{dayPlans.length - 3} daha
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
