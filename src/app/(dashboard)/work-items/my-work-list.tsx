/**
 * Çalışanın kendi iş listesi — satır başına: tarih, başlık, kimin için,
 * harita, durum, ücret. TASLAK satırlarda Düzenle / Sil.
 * Mobilde de aynı satır düzeni (kart değil, sıkı liste) — maçtan sonra
 * telefondan bakılacak ekran.
 */

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, getWorkTypeLabel } from '@/lib/utils';
import { shortDate } from '@/components/dashboard/utils';
import { MEMBER_STATUS, isExternalWork, workItemTitle } from '@/lib/work-summary';
import type { WorkItem } from '@/types';
import { OwnItemActions } from './own-item-actions';

export function MyWorkList({ items, emptyText }: { items: WorkItem[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        <p>{emptyText}</p>
        <Link href="/work-items/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Yeni iş gir
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {items.map((item) => {
        const st = MEMBER_STATUS[item.status];
        const external = isExternalWork(item);
        return (
          // Mobil: 2 sütunlu ızgara (başlık+bilgi | tutar/işlemler) — başlık
          // kesilmesin. sm+: tek satır (tarih, başlık, durum, tutar, işlem).
          <li
            key={item.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:flex sm:gap-3"
          >
            <div className="hidden w-12 shrink-0 text-xs tabular-nums text-[var(--color-text-muted)] sm:block">
              {shortDate(item.work_date)}
            </div>

            <div className="row-span-2 min-w-0 sm:row-span-1 sm:flex-1">
              <p className="line-clamp-2 text-sm font-medium text-[var(--color-text-primary)] sm:truncate">
                {workItemTitle(item)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)] sm:mt-0.5">
                <span className="tabular-nums sm:hidden">{shortDate(item.work_date)} ·</span>
                <span>{getWorkTypeLabel(item.work_type)}</span>
                {item.map_count ? <span className="tabular-nums">· {item.map_count} harita</span> : null}
                {external && (
                  <span className="rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                    {item.client!.name}
                  </span>
                )}
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium sm:hidden"
                  style={{ color: st.color, backgroundColor: st.bg }}
                >
                  {st.label}
                </span>
              </p>
            </div>

            <span
              className="hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block"
              style={{ color: st.color, backgroundColor: st.bg }}
            >
              {st.label}
            </span>

            <div className="shrink-0 text-right sm:w-24">
              {item.cost != null ? (
                <span className="font-mono text-sm tabular-nums text-[var(--color-text-primary)]">
                  {formatCurrency(Number(item.cost))}
                </span>
              ) : (
                <span className="text-xs text-[var(--color-warning)]" title="Ücret admin onayında belirlenecek">
                  Ücret bekleniyor
                </span>
              )}
            </div>

            <div className="flex shrink-0 justify-end sm:w-[72px] sm:justify-center">
              {item.status === 'DRAFT' ? (
                <OwnItemActions workItemId={item.id} />
              ) : (
                <span className="block text-center text-[10px] text-[var(--color-text-muted)]" title="Onaylanan iş düzenlenemez">
                  Kilitli
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
