'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  type ContentQueueItem,
  type ContentPlatform,
} from './content-queue.constants';
import { updateContentItem } from './queue-actions';
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

interface CardProps {
  item: ContentQueueItem;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}

function CalendarCard({ item, onClick, onDragStart, onDragEnd, dragging }: CardProps) {
  const isPublished = item.status === 'YAYINLANDI';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="group w-full cursor-grab rounded-[var(--radius-sm)] p-2 text-left transition-shadow hover:shadow-sm active:cursor-grabbing"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        opacity: dragging ? 0.4 : isPublished ? 0.6 : 1,
      }}
    >
      {/* Platform badges */}
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <GripVertical
          className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
          style={{ color: 'var(--color-text-muted)' }}
        />
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
        className="line-clamp-2 text-[11px] font-semibold leading-snug"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {item.title}
      </p>

      {/* Text preview */}
      {item.content_text && (
        <p
          className="mt-1 line-clamp-2 text-[10px] leading-snug"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {item.content_text}
        </p>
      )}
    </div>
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

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // day key or 'UNPLANNED'
  const [, startTransition] = useTransition();

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

  // Schedule / reschedule / unschedule via drag-drop
  function handleDrop(target: string | null) {
    const id = draggingId;
    setDropTarget(null);
    setDraggingId(null);
    if (!id) return;

    const item = items.find((i) => i.id === id);
    const newDate = target === 'UNPLANNED' ? null : target;
    if (!item || item.planned_date === newDate) return;

    startTransition(async () => {
      await updateContentItem(id, { planned_date: newDate });
    });
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
            className="rounded-[var(--radius-sm)] p-1.5 transition-colors hover:bg-black/5"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            title="Önceki hafta"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(startOfWeek(new Date()))}
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            Bu Hafta
          </button>
          <button
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="rounded-[var(--radius-sm)] p-1.5 transition-colors hover:bg-black/5"
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
          const isDropHover = dropTarget === key;

          return (
            <div
              key={key}
              onDragOver={(e) => {
                if (!draggingId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dropTarget !== key) setDropTarget(key);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDropTarget((t) => (t === key ? null : t));
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(key);
              }}
              className="flex min-h-[140px] flex-col rounded-[var(--radius-md)] transition-colors"
              style={{
                backgroundColor: isDropHover ? 'var(--color-accent-muted)' : 'var(--color-surface-1)',
                border: isDropHover
                  ? '1px dashed var(--color-accent)'
                  : isToday
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
                  className="rounded p-0.5 transition-colors hover:bg-black/5"
                  title="Bu güne içerik ekle"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {dayItems.length === 0 ? (
                  <div
                    className="flex flex-1 items-center justify-center rounded-[var(--radius-sm)] py-3 text-[10px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isDropHover ? 'Buraya bırak' : ''}
                  </div>
                ) : (
                  dayItems.map((item) => (
                    <CalendarCard
                      key={item.id}
                      item={item}
                      onClick={() => openEdit(item)}
                      onDragStart={() => setDraggingId(item.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTarget(null);
                      }}
                      dragging={draggingId === item.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock / unplanned tray — drop here to unschedule, drag out to schedule */}
      <div
        onDragOver={(e) => {
          if (!draggingId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dropTarget !== 'UNPLANNED') setDropTarget('UNPLANNED');
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDropTarget((t) => (t === 'UNPLANNED' ? null : t));
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop('UNPLANNED');
        }}
        className="mt-5 rounded-[var(--radius-md)] p-3 transition-colors"
        style={{
          backgroundColor: dropTarget === 'UNPLANNED' ? 'var(--color-accent-muted)' : 'var(--color-surface-1)',
          border:
            dropTarget === 'UNPLANNED'
              ? '1px dashed var(--color-accent)'
              : '1px solid var(--color-border)',
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Stok — Tarih Bekleyenler ({unplanned.length})
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            — hazır içerikleri yukarıda bir güne sürükle
          </span>
        </div>
        {unplanned.length === 0 ? (
          <p className="py-2 text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {dropTarget === 'UNPLANNED' ? 'Tarihten çıkarmak için bırak' : 'Bekleyen içerik yok.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {unplanned.map((item) => (
              <CalendarCard
                key={item.id}
                item={item}
                onClick={() => openEdit(item)}
                onDragStart={() => setDraggingId(item.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTarget(null);
                }}
                dragging={draggingId === item.id}
              />
            ))}
          </div>
        )}
      </div>

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
