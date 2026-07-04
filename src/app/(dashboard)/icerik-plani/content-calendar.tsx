'use client';

import { useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  type ContentQueueItem,
  type ContentPlatform,
} from './content-queue.constants';
import { ContentForm } from './content-form';

// ── Date helpers (local, TZ-safe via YYYY-MM-DD keys) ───────────────────────────

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - dow);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// ── Card ─────────────────────────────────────────────────────────────────────

function CalendarCard({ item, onClick }: { item: ContentQueueItem; onClick: () => void }) {
  const isPublished = item.status === 'YAYINLANDI';

  return (
    <button
      onClick={onClick}
      className="w-full rounded-[var(--radius-sm)] p-2 text-left transition-shadow hover:shadow-sm"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        opacity: isPublished ? 0.6 : 1,
      }}
    >
      {/* Platform badges */}
      <div className="mb-1 flex flex-wrap gap-1">
        {item.platforms.map((p: ContentPlatform) => {
          const c = PLATFORM_COLORS[p];
          return (
            <span
              key={p}
              className="rounded px-1 py-0.5 text-[9px] font-semibold leading-none"
              style={{ backgroundColor: c.bg, color: c.color }}
            >
              {PLATFORM_LABELS[p]}
            </span>
          );
        })}
      </div>

      {/* Title */}
      <p
        className="line-clamp-2 text-[11px] font-medium leading-snug"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {item.title}
      </p>

      {/* Text preview */}
      {item.content_text && (
        <p
          className="mt-1 line-clamp-2 text-[10px] leading-snug"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {item.content_text}
        </p>
      )}
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface ContentCalendarProps {
  items: ContentQueueItem[];
}

export function ContentCalendar({ items }: ContentCalendarProps) {
  const [anchor, setAnchor] = useState<Date>(() => startOfWeek(new Date()));
  const [editItem, setEditItem] = useState<ContentQueueItem | null>(null);
  const [addDate, setAddDate] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const todayKey = toKey(new Date());

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor]
  );

  const byDate = useMemo(() => {
    const map: Record<string, ContentQueueItem[]> = {};
    for (const item of items) {
      if (!item.planned_date) continue;
      (map[item.planned_date] ||= []).push(item);
    }
    return map;
  }, [items]);

  const unplanned = useMemo(
    () => items.filter((i) => !i.planned_date && i.status !== 'YAYINLANDI'),
    [items]
  );

  function openAdd(dateKey?: string) {
    setEditItem(null);
    setAddDate(dateKey);
    setFormOpen(true);
  }
  function openEdit(item: ContentQueueItem) {
    setEditItem(item);
    setAddDate(undefined);
    setFormOpen(true);
  }

  const weekLabel = `${anchor.getDate()} ${MONTHS[anchor.getMonth()]} – ${
    days[6].getDate()
  } ${MONTHS[days[6].getMonth()]}`;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor(addDays(anchor, -7))}
            className="rounded-[var(--radius-sm)] p-1.5 transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            title="Önceki hafta"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(startOfWeek(new Date()))}
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            Bu Hafta
          </button>
          <button
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="rounded-[var(--radius-sm)] p-1.5 transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            title="Sonraki hafta"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {weekLabel}
          </span>
        </div>
        <Button onClick={() => openAdd()} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Yeni İçerik
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day, idx) => {
          const key = toKey(day);
          const dayItems = byDate[key] || [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className="flex min-h-[140px] flex-col rounded-[var(--radius-md)]"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                border: isToday
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
              }}
            >
              {/* Day header */}
              <div
                className="flex items-center justify-between px-2.5 py-2"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                >
                  {DAY_NAMES[idx]} {day.getDate()}
                </span>
                <button
                  onClick={() => openAdd(key)}
                  className="rounded p-0.5 transition-colors hover:bg-white/10"
                  title="Bu güne içerik ekle"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {dayItems.length === 0 ? (
                  <button
                    onClick={() => openAdd(key)}
                    className="flex flex-1 items-center justify-center rounded-[var(--radius-sm)] py-3 text-[10px] transition-colors hover:bg-white/5"
                    style={{ color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}
                  >
                    +
                  </button>
                ) : (
                  dayItems.map((item) => (
                    <CalendarCard key={item.id} item={item} onClick={() => openEdit(item)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unplanned bucket */}
      {unplanned.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Tarihsiz ({unplanned.length})
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              — bir tarih vermek için karta tıkla
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {unplanned.map((item) => (
              <CalendarCard key={item.id} item={item} onClick={() => openEdit(item)} />
            ))}
          </div>
        </div>
      )}

      <ContentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditItem(null);
          setAddDate(undefined);
        }}
        item={editItem}
        defaultDate={addDate}
      />
    </div>
  );
}
