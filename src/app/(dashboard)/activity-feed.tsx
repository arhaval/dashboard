'use client';

/**
 * Son aktivite akışı (Tessera "Recent activity") — tüm dashboard'lar kullanır.
 * Veri sunucuda hazırlanır (göreli zaman dahil); burada filtre + çizim var.
 * Satır metni: "<b>{actor}</b> <b>{subject}</b> {verb}"
 */

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/tabs';

export interface ActivityEvent {
  id: string;
  /** Filtre anahtarı (filters'taki key ile eşleşir) */
  kind: string;
  /** YYYY-MM-DD veya ISO — sıralama için */
  date: string;
  actor: string;
  actorInitials: string;
  actorAvatar: string | null;
  subject: string;
  verb: string;
  when: string;
  meta: string;
  status: { label: string; color: string; bg: string };
  href: string;
}

export interface ActivityFilter { key: string; label: string }

export function ActivityFeed({
  title = 'Son aktivite',
  events,
  filters,
  viewAllHref,
  limit = 6,
}: {
  title?: string;
  events: ActivityEvent[];
  /** İlk filtre "Tümü" gibi her şeyi göstermeli (key: 'all') */
  filters: ActivityFilter[];
  viewAllHref: string;
  limit?: number;
}) {
  const [filter, setFilter] = React.useState(filters[0]?.key ?? 'all');
  const rows = (filter === 'all' ? events : events.filter((e) => e.kind === filter)).slice(0, limit);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <div className="flex items-center gap-3">
          <SegmentedControl
            items={filters.map((f) => ({ key: f.key, label: f.label, active: filter === f.key, onClick: () => setFilter(f.key) }))}
          />
          <Link href={viewAllHref} className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            Tümünü gör
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] py-10 text-center text-sm text-[var(--color-text-muted)]">
          Henüz aktivite yok.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent-muted)] text-[11px] font-semibold text-[var(--color-accent)]">
                {e.actorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.actorAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  e.actorInitials
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--color-text-secondary)]">
                  {e.actor && <b className="font-semibold text-[var(--color-text-primary)]">{e.actor} </b>}
                  <b className="font-semibold text-[var(--color-text-primary)]">{e.subject}</b> {e.verb}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                  {e.when} · {e.meta}
                </p>
              </div>
              <span
                className="hidden flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
                style={{ color: e.status.color, background: e.status.bg }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.status.color }} />
                {e.status.label}
              </span>
              <Link
                href={e.href}
                title="Detay"
                aria-label="Detay"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
