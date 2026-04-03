'use client';

/**
 * ScheduleEditor
 * Haftalık program düzenleme + paylaşma
 */

import { useState, useTransition } from 'react';
import { updateDaySchedule } from './actions';
import { Check, Copy, Printer, Plus, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
  DAY_LABELS,
  ALL_ACTIVITIES,
  formatScheduleForSharing,
} from '@/services/weekly-schedule.utils';
import type { DaySchedule, WeekActivity } from '@/services/weekly-schedule.utils';


// ─── Activity Chip ───────────────────────────────────

function ActivityChip({
  activity,
  onRemove,
  isAdmin,
}: {
  activity: WeekActivity;
  onRemove?: () => void;
  isAdmin: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        ACTIVITY_COLORS[activity]
      )}
    >
      {ACTIVITY_LABELS[activity]}
      {isAdmin && onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

// ─── Day Row ─────────────────────────────────────────

function DayRow({
  day,
  isAdmin,
}: {
  day: DaySchedule;
  isAdmin: boolean;
}) {
  const [activities, setActivities] = useState<WeekActivity[]>(day.activities);
  const [notes, setNotes] = useState(day.notes ?? '');
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = (newActivities: WeekActivity[], newNotes?: string) => {
    startTransition(async () => {
      await updateDaySchedule(day.day_of_week, newActivities, newNotes ?? notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const addActivity = (activity: WeekActivity) => {
    if (activities.includes(activity)) return;
    const updated = [...activities, activity];
    setActivities(updated);
    save(updated);
    setShowPicker(false);
  };

  const removeActivity = (activity: WeekActivity) => {
    const updated = activities.filter((a) => a !== activity);
    setActivities(updated);
    save(updated);
  };

  const dayLabel = DAY_LABELS[day.day_of_week - 1];
  const available = ALL_ACTIVITIES.filter((a) => !activities.includes(a));

  return (
    <div className="flex items-start gap-4 border-b border-[var(--color-border)] py-4 last:border-0">
      {/* Day label */}
      <div className="w-24 flex-shrink-0 pt-1">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{dayLabel}</p>
        {saved && (
          <p className="text-[10px] text-[var(--color-success)]">Kaydedildi ✓</p>
        )}
      </div>

      {/* Activities */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {activities.length === 0 && (
          <span className="text-xs text-[var(--color-text-muted)] italic">— boş —</span>
        )}
        {activities.map((a) => (
          <ActivityChip
            key={a}
            activity={a}
            isAdmin={isAdmin}
            onRemove={() => removeActivity(a)}
          />
        ))}

        {/* Add button */}
        {isAdmin && available.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              <Plus className="h-3 w-3" />
              Ekle
              <ChevronDown className="h-3 w-3" />
            </button>

            {showPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowPicker(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1.5 shadow-lg">
                  {available.map((a) => (
                    <button
                      key={a}
                      onClick={() => addActivity(a)}
                      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <span
                        className={cn(
                          'inline-block rounded-full border px-2 py-0.5 text-[10px]',
                          ACTIVITY_COLORS[a]
                        )}
                      >
                        {ACTIVITY_LABELS[a]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {isAdmin && (
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save(activities)}
          placeholder="Not ekle..."
          className="w-36 flex-shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
        />
      )}
      {!isAdmin && notes && (
        <span className="text-xs text-[var(--color-text-muted)] italic">{notes}</span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────

interface ScheduleEditorProps {
  schedule: DaySchedule[];
  isAdmin: boolean;
}

export function ScheduleEditor({ schedule, isAdmin }: ScheduleEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = formatScheduleForSharing(schedule);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Export bar */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-[var(--color-text-muted)]">
          {isAdmin
            ? 'Günlere tıklayarak aktivite ekle veya çıkar'
            : 'Haftalık program — admin tarafından belirlenir'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition-colors',
              copied
                ? 'border-[var(--color-success)] bg-[var(--color-success-muted)] text-[var(--color-success)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
            )}
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5" /> Kopyalandı!</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Kopyala</>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Yazdır / PDF
          </button>
        </div>
      </div>

      {/* Schedule rows */}
      <div>
        {schedule.map((day) => (
          <DayRow key={day.day_of_week} day={day} isAdmin={isAdmin} />
        ))}
      </div>

      {/* Share preview */}
      <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Paylaşım Önizlemesi (WhatsApp / Telegram)
        </p>
        <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {formatScheduleForSharing(schedule)}
        </pre>
      </div>
    </div>
  );
}
