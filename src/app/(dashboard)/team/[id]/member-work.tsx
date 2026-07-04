/**
 * MemberWork
 * Admin-only: shows a team member's work items (jobs) — summary + recent list.
 * Server component; receives pre-fetched work items.
 */

import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Radio, Mic, Scissors } from 'lucide-react';
import type { WorkItem, WorkType, WorkStatus } from '@/types';

const TYPE_LABELS: Record<WorkType, string> = {
  STREAM: 'Yayın',
  VOICE: 'Seslendirme',
  EDIT: 'Kurgu',
};

const TYPE_ICONS: Record<WorkType, React.ReactNode> = {
  STREAM: <Radio className="h-4 w-4" />,
  VOICE: <Mic className="h-4 w-4" />,
  EDIT: <Scissors className="h-4 w-4" />,
};

const STATUS_STYLES: Record<WorkStatus, { label: string; cls: string }> = {
  DRAFT:    { label: 'Taslak', cls: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]' },
  APPROVED: { label: 'Onaylı', cls: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]' },
  PAID:     { label: 'Ödendi', cls: 'bg-[var(--color-success-muted)] text-[var(--color-success)]' },
};

function workItemName(item: WorkItem): string {
  return item.match_name || item.content_name || TYPE_LABELS[item.work_type];
}

interface MemberWorkProps {
  workItems: WorkItem[];
}

export function MemberWork({ workItems }: MemberWorkProps) {
  const total = workItems.length;
  const approved = workItems.filter((i) => i.status === 'APPROVED');
  const paid = workItems.filter((i) => i.status === 'PAID');

  const pendingAmount = approved.reduce((sum, i) => sum + (i.cost ?? 0), 0);
  const paidAmount = paid.reduce((sum, i) => sum + (i.cost ?? 0), 0);

  const byType = (['STREAM', 'VOICE', 'EDIT'] as WorkType[]).map((t) => ({
    type: t,
    count: workItems.filter((i) => i.work_type === t).length,
  }));

  const recent = [...workItems]
    .sort((a, b) => (a.work_date < b.work_date ? 1 : -1))
    .slice(0, 10);

  if (total === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Bu üyeye ait iş kaydı yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam İş</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{total}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Bekleyen ({approved.length})</p>
          <p className="text-2xl font-semibold text-[var(--color-warning)]">{formatCurrency(pendingAmount)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Ödenen ({paid.length})</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="mb-2 text-sm text-[var(--color-text-muted)]">Tür Dağılımı</p>
          <div className="flex flex-wrap gap-2">
            {byType.filter((b) => b.count > 0).map((b) => (
              <span
                key={b.type}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]"
              >
                {TYPE_ICONS[b.type]} {TYPE_LABELS[b.type]} · {b.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent list */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              {['Tarih', 'Tür', 'İş', 'Durum', 'Tutar'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((item, idx) => {
              const status = STATUS_STYLES[item.status];
              return (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)] last:border-0"
                  style={{ backgroundColor: idx % 2 === 0 ? 'var(--color-table-row-odd)' : 'var(--color-table-row-even)' }}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                    {formatDate(item.work_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                      {TYPE_ICONS[item.work_type]} {TYPE_LABELS[item.work_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                    {workItemName(item)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', status.cls)}>
                      {status.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text-primary)]">
                    {item.cost != null ? formatCurrency(item.cost) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
