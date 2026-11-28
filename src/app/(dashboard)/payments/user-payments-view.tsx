/**
 * UserPaymentsView — admin dışı kullanıcının ödeme ekranı (Tessera dili).
 * Genel bakış kartları · kazanç dağılımı + aylık ödeme grafiği ·
 * alacak ve ödenen listeleri.
 */

import { CreditCard as PageIcon, Banknote, Wallet, TrendingUp, Radio, Mic, Scissors, Receipt } from 'lucide-react';
import { formatCurrency, getWorkTypeLabel } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { PageShell } from '@/components/layout';
import { OverviewCard, CapacityCard, BarsChart, SectionHead, shortTL } from '@/components/dashboard/widgets';
import { LedgerList, type LedgerRow } from '@/components/dashboard/ledger-list';
import { TR_MONTHS, shortDate } from '@/components/dashboard/utils';
import type { User, WorkItem, Payment, Transaction, WorkType } from '@/types';

interface UserPaymentsViewProps {
  currentUser: User;
  paidWorkItems: WorkItem[];
  approvedWorkItems: WorkItem[];
  userPayments: Payment[];
  userTransactions: Transaction[];
}

const TYPE_ICON: Record<WorkType, typeof Radio> = { STREAM: Radio, VOICE: Mic, EDIT: Scissors };

function paymentSummary(payment: Payment): string {
  const items = payment.payment_items ?? [];
  if (items.length === 0) return 'İş ödemesi';
  if (items.length === 1) {
    const item = items[0].work_item;
    return item?.match_name || item?.content_name || 'İş ödemesi';
  }
  return `${items.length} iş kalemi`;
}

export function UserPaymentsView({
  paidWorkItems,
  approvedWorkItems,
  userPayments,
  userTransactions,
}: UserPaymentsViewProps) {
  const paidPayments = userPayments.filter((p) => p.status === 'PAID');
  const expenseTx = userTransactions.filter((t) => t.type === 'EXPENSE');

  const totalPaid =
    paidWorkItems.reduce((s, i) => s + (i.cost || 0), 0) + expenseTx.reduce((s, t) => s + Number(t.amount), 0);
  const totalPending = approvedWorkItems.reduce((s, i) => s + (i.cost || 0), 0);

  // Ödenenler: iş ödemeleri + yöneticinin girdiği gerçekleşen işlemler, yeniden eskiye
  const paidRows = [
    ...paidPayments.map((p) => ({ date: p.payment_date, amount: Number(p.amount), title: paymentSummary(p), kind: 'İş ödemesi', id: `p-${p.id}` })),
    ...expenseTx.map((t) => ({ date: t.transaction_date, amount: Number(t.amount), title: t.description || t.category, kind: t.category, id: `t-${t.id}` })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Son 6 ayın ödemeleri
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { label: TR_MONTHS[d.getMonth()].slice(0, 3), value: paidRows.filter((r) => r.date.startsWith(mk)).reduce((s, r) => s + r.amount, 0) };
  });
  const [prev, cur] = [monthly[4].value, monthly[5].value];
  const deltaPct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

  const pendingRows: LedgerRow[] = approvedWorkItems.map((i) => ({
    id: i.id,
    icon: TYPE_ICON[i.work_type],
    tone: 'warning',
    title: i.match_name || i.content_name || getWorkTypeLabel(i.work_type),
    // Dış ortak (Sangal vb.) işi alt satırda adıyla belli olur
    sub: [i.client && !i.client.is_internal ? i.client.name : null, getWorkTypeLabel(i.work_type), shortDate(i.work_date)]
      .filter(Boolean).join(' · '),
    pill: { label: 'Ödeme bekliyor', tone: 'warning' },
    amount: formatCurrency(i.cost || 0),
    amountTone: 'warning',
  }));

  const doneRows: LedgerRow[] = paidRows.map((r) => ({
    id: r.id,
    icon: r.kind === 'İş ödemesi' ? Banknote : Receipt,
    tone: 'success',
    title: r.title,
    sub: `${r.kind} · ${shortDate(r.date)}`,
    pill: { label: 'Ödendi', tone: 'success' },
    amount: `+${formatCurrency(r.amount)}`,
    amountTone: 'success',
  }));

  return (
    <PageShell icon={PageIcon} title={tr.pages.payments.title} description="Ödeme durumun">
      <div className="space-y-6">
        <section>
          <SectionHead title="Genel bakış" chip="Tüm zamanlar" />
          <div className="grid gap-3 md:grid-cols-3">
            <OverviewCard label="Toplam ödenen" hint="Hesabına geçen tüm ödemeler" value={formatCurrency(totalPaid)}
              trend={paidRows.length ? 'up' : 'neutral'} trendText={`${paidRows.length} ödeme alındı`}
              icon={Banknote} iconColor="var(--color-success)" />
            <OverviewCard label="Bekleyen alacak" hint="Onaylanmış ama henüz ödenmemiş işlerin" value={formatCurrency(totalPending)}
              trend={approvedWorkItems.length ? 'up' : 'neutral'}
              trendText={approvedWorkItems.length ? `${approvedWorkItems.length} iş ödeme bekliyor` : 'Bekleyen yok'}
              icon={Wallet} iconColor="var(--color-warning)" />
            <OverviewCard label="Toplam kazanç" hint="Ödenen + bekleyen alacak" value={formatCurrency(totalPaid + totalPending)}
              trend="neutral" trendText="Ödenen + alacak" icon={TrendingUp} iconColor="var(--color-accent)" />
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <CapacityCard
            title="Kazanç dağılımı"
            subtitle="Ödenen ve bekleyen"
            chip="Tüm zamanlar"
            total={totalPaid + totalPending}
            totalLabel="toplam"
            segments={[
              { label: 'Ödenen', amount: totalPaid, color: 'var(--color-success)' },
              { label: 'Alacak', amount: totalPending, color: 'var(--color-warning)' },
            ]}
          />
          <BarsChart
            title="Aylık ödemeler"
            subtitle="Hesabına geçen · ortalamaya göre"
            chip="Son 6 ay"
            data={monthly}
            format={shortTL}
            callout={deltaPct === null ? null : `${deltaPct >= 0 ? '↑' : '↓'} ${Math.abs(deltaPct)}%`}
          />
        </div>

        <LedgerList title="Alacak" rows={pendingRows} emptyText="Bekleyen alacağın yok" />
        <LedgerList title="Ödenenler" rows={doneRows} emptyText="Henüz ödeme yapılmamış" />
      </div>
    </PageShell>
  );
}
