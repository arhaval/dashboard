'use client';

/**
 * ContentCalendarClient
 * Client wrapper for the calendar page — handles month navigation,
 * "Yeni Plan" button, and AddPlanForm slide-in panel.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarGrid } from './calendar-grid';
import { AddPlanForm } from './add-plan-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentPlan } from '@/types';

interface ContentCalendarClientProps {
  plans: ContentPlan[];
  month: string; // YYYY-MM
  isAdmin: boolean;
  availableMonths: string[];
  members: Array<{ id: string; full_name: string }>;
  currentMonth: string;
}

/** Format YYYY-MM → "Nisan 2026" */
function formatMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });
}

function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ContentCalendarClient({
  plans,
  month,
  isAdmin,
  availableMonths,
  members,
  currentMonth,
}: ContentCalendarClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const handleMonthChange = (newMonth: string) => {
    router.push(`/content?month=${newMonth}`);
  };

  const handleDayClick = (date: string) => {
    setDefaultDate(date);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setDefaultDate(undefined);
  };

  return (
    <>
      <Card>
        {/* Calendar Header */}
        <CardHeader className="border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMonthChange(prevMonth(month))}
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
                <CardTitle className="text-sm font-semibold capitalize text-[var(--color-text-primary)]">
                  {formatMonth(month)}
                </CardTitle>
              </div>

              <button
                onClick={() => handleMonthChange(nextMonth(month))}
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {month !== currentMonth && (
                <button
                  onClick={() => handleMonthChange(currentMonth)}
                  className="ml-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                >
                  Bugün
                </button>
              )}
            </div>

            {/* Right: Month Picker select + Add button */}
            <div className="flex items-center gap-2">
              {/* Quick month jump */}
              <select
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className={cn(
                  'rounded-[var(--radius-md)] border border-[var(--color-border)]',
                  'bg-[var(--color-bg-secondary)] px-2 py-1.5',
                  'text-xs text-[var(--color-text-primary)]',
                  'outline-none focus:border-[var(--color-accent)] transition-colors'
                )}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))}
              </select>

              {/* Add plan button — admin only */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setDefaultDate(undefined);
                    setShowForm(true);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)]',
                    'px-3 py-1.5 text-xs font-semibold text-white',
                    'hover:bg-[var(--color-accent-hover)] transition-colors'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Yeni Plan
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Calendar Body */}
        <CardContent className="p-4">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-text-muted)]">
              <CalendarDays className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Bu ay henüz plan yok</p>
              {isAdmin && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-1 flex items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-accent)]/40 px-4 py-2 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> İlk planı ekle
                </button>
              )}
            </div>
          ) : (
            <CalendarGrid
              plans={plans}
              month={month}
              isAdmin={isAdmin}
              onDayClick={handleDayClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Plan Slide-in Panel */}
      {showForm && isAdmin && (
        <AddPlanForm
          defaultDate={defaultDate}
          members={members}
          onClose={handleCloseForm}
        />
      )}
    </>
  );
}
