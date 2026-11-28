/**
 * Kişisel iş özetleri — saf fonksiyonlar (sunucu/istemci fark etmez).
 * Ana sayfa (DashboardPersonal) ve "İşlerim" görünümü aynı hesabı kullanır.
 *
 * Yalnızca `cost` (çalışanın hak edişi) kullanılır; müşteriye kesilen tutar
 * (bill_amount) çalışan ekranlarına hiç girmez.
 */

import type { WorkItem, WorkStatus } from '@/types';

/** Çalışanın gözünden durum adları. */
export const MEMBER_STATUS: Record<WorkStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Onay bekliyor', color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)' },
  APPROVED: { label: 'Ödeme bekliyor', color: 'var(--color-warning)', bg: 'var(--color-warning-muted)' },
  PAID: { label: 'Ödendi', color: 'var(--color-success)', bg: 'var(--color-success-muted)' },
};

export const INTERNAL_CLIENT_LABEL = 'Arhaval';

/** Dış ortak (Sangal vb.) işi mi? İç iş ya da müşterisiz = Arhaval. */
export const isExternalWork = (i: WorkItem) => Boolean(i.client && !i.client.is_internal);

export const clientLabelOf = (i: WorkItem) => (isExternalWork(i) ? i.client!.name : INTERNAL_CLIENT_LABEL);

const CLIENT_COLORS = ['var(--color-warning)', 'var(--color-purple)', 'var(--color-success)'];

/** Hak edişi müşteriye göre böl: önce Arhaval, sonra her dış ortak ayrı. */
export function splitByClient(items: WorkItem[]) {
  const map = new Map<string, number>();
  for (const i of items) {
    const name = clientLabelOf(i);
    map.set(name, (map.get(name) ?? 0) + Number(i.cost ?? 0));
  }
  const ext = [...map.entries()].filter(([n]) => n !== INTERNAL_CLIENT_LABEL);
  return [
    ...(map.has(INTERNAL_CLIENT_LABEL)
      ? [{ label: INTERNAL_CLIENT_LABEL, amount: map.get(INTERNAL_CLIENT_LABEL)!, color: 'var(--color-accent)' }]
      : []),
    ...ext.map(([label, amount], k) => ({ label, amount, color: CLIENT_COLORS[k % CLIENT_COLORS.length] })),
  ];
}

export interface StatusBucket {
  count: number;
  amount: number;
}

export interface WorkSummary {
  count: number;
  maps: number;
  total: number;
  draft: StatusBucket & { unpriced: number };
  approved: StatusBucket;
  paid: StatusBucket;
}

/** Bir iş listesinin durum bazlı özeti. */
export function summarizeWork(items: WorkItem[]): WorkSummary {
  const s: WorkSummary = {
    count: items.length,
    maps: 0,
    total: 0,
    draft: { count: 0, amount: 0, unpriced: 0 },
    approved: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
  };
  for (const i of items) {
    const cost = Number(i.cost ?? 0);
    s.maps += i.map_count ?? 0;
    s.total += cost;
    if (i.status === 'DRAFT') {
      s.draft.count += 1;
      s.draft.amount += cost;
      if (i.cost == null) s.draft.unpriced += 1;
    } else if (i.status === 'APPROVED') {
      s.approved.count += 1;
      s.approved.amount += cost;
    } else {
      s.paid.count += 1;
      s.paid.amount += cost;
    }
  }
  return s;
}

export function workItemTitle(i: WorkItem): string {
  return (i.work_type === 'STREAM' ? i.match_name : i.content_name) || 'İş kaydı';
}
