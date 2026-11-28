/**
 * Hızlı giriş — çalışanın ana ekranının en üstü. En sık yapılan iş (yayın /
 * iş girmek) tek dokunuşta: büyük "Yayın gir" + girilmesi beklenen planlar
 * (her biri önceden dolu formu açar) + ücreti belirlenmemiş iş uyarısı.
 * Telefonda tam genişlik, büyük dokunma alanı.
 */

import Link from 'next/link';
import { Plus, ChevronRight, AlertTriangle, CalendarClock } from 'lucide-react';
import { relFuture, shortDate } from '@/components/dashboard/utils';
import type { ContentPlan } from '@/types';

const MAX_PLANS = 3;

interface QuickEntryProps {
  isStream: boolean;
  /** Açık planlar (tarih sırasıyla). */
  plans: ContentPlan[];
  today: string;
  /** Ücreti henüz belirlenmemiş taslak iş sayısı. */
  unpricedCount: number;
}

export function QuickEntry({ isStream, plans, today, unpricedCount }: QuickEntryProps) {
  const shown = plans.slice(0, MAX_PLANS);
  const late = plans.filter((p) => p.planned_date < today).length;

  return (
    <section className="space-y-3">
      <Link
        href="/work-items/new"
        className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-text-primary)] text-base font-semibold text-[var(--color-bg-primary)] transition-opacity hover:opacity-90 sm:h-12 sm:w-auto sm:justify-start sm:px-5 sm:text-sm md:inline-flex"
      >
        <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
        {isStream ? 'Yayın gir' : 'İş gir'}
      </Link>

      {unpricedCount > 0 && (
        <Link
          href="/work-items"
          className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-warning)]/40 bg-[var(--color-warning-muted)] px-3.5 py-3 text-sm text-[var(--color-warning)]"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="min-w-0 flex-1">
            {unpricedCount} {isStream ? 'yayının' : 'işinin'} ücreti henüz belirlenmedi — admin onayda belirleyecek.
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        </Link>
      )}

      {shown.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <CalendarClock className="h-4 w-4 text-[var(--color-accent)]" />
              {isStream ? 'Planlı yayınların' : 'Planlı işlerin'}
            </span>
            {late > 0 && (
              <span className="rounded-full bg-[var(--color-error-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-error)]">
                {late} girilmedi
              </span>
            )}
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {shown.map((p) => {
              const isLate = p.planned_date < today;
              const isStreamPlan = p.content_type === 'STREAM';
              const client = p.client && !p.client.is_internal ? p.client.name : null;
              return (
                <li key={p.id}>
                  <Link
                    href={isStreamPlan ? `/work-items/new?plan=${p.id}` : '/icerik-plani'}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">{p.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className={isLate ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'}>
                          {isLate ? `${shortDate(p.planned_date)} · girilmedi` : relFuture(p.planned_date, today)}
                        </span>
                        {client && (
                          <span className="rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                            {client}
                          </span>
                        )}
                      </span>
                    </span>
                    {isStreamPlan && (
                      <span className="flex flex-shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-hover)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)]">
                        Gir <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
