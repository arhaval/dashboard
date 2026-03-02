/**
 * Team Member Dashboard View
 * Shows personal work items, pending payments, and recent earnings.
 */

import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, Wallet, CheckCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import type { WorkItem, Payment, Transaction } from '@/types';

export interface DashboardMemberProps {
  userWorkItems: WorkItem[];
  userPayments: Payment[];
  userTransactions: Transaction[];
}

export function DashboardMember({
  userWorkItems,
  userPayments,
  userTransactions,
}: DashboardMemberProps) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthWorkItems = userWorkItems.filter((i) => i.work_date.startsWith(thisMonth));
  const draftItems = userWorkItems.filter((i) => i.status === 'DRAFT');
  const approvedItems = userWorkItems.filter((i) => i.status === 'APPROVED');
  const paidItems = userWorkItems.filter((i) => i.status === 'PAID');

  const totalEarnedFromWorkItems = paidItems.reduce((s, i) => s + (i.cost || 0), 0);
  const pendingAmount = approvedItems.reduce((s, i) => s + (i.cost || 0), 0);

  const userExpenseTransactions = userTransactions.filter((t) => t.type === 'EXPENSE');
  const totalFromTransactions = userExpenseTransactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalEarned = totalEarnedFromWorkItems + totalFromTransactions;
  const totalPaidCount = paidItems.length + userExpenseTransactions.length;

  const stats = [
    { title: 'Bu Ay İş Kaydı', value: thisMonthWorkItems.length.toString(), description: 'Bu ay eklenen işler', icon: FileText, color: 'text-[var(--color-text-primary)]' },
    { title: 'Bekleyen Onay', value: draftItems.length.toString(), description: 'Taslak durumunda', icon: Clock, color: 'text-[var(--color-warning)]' },
    { title: 'Alacak', value: formatCurrency(pendingAmount), description: `${approvedItems.length} onaylı iş`, icon: Wallet, color: 'text-[var(--color-warning)]' },
    { title: 'Toplam Kazanç', value: formatCurrency(totalEarned), description: `${totalPaidCount} ödenen iş`, icon: CheckCircle, color: 'text-[var(--color-success)]' },
  ];

  const recentPayments = buildRecentPayments(userPayments, userExpenseTransactions);

  return (
    <PageShell title={tr.dashboard.title} description="Kişisel iş ve ödeme durumunuz">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-semibold', stat.color)}>{stat.value}</div>
                <p className="text-xs text-[var(--color-text-muted)]">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PendingSummaryCard approvedItems={approvedItems} />
        <RecentPaymentsCard payments={recentPayments} />
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Internal components                                                 */
/* ------------------------------------------------------------------ */

const ROW_CLASS =
  'flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3';

function EmptyPlaceholder({ text }: { text: string }) {
  return (
    <div
      className={cn(
        'flex h-32 items-center justify-center',
        'rounded-[var(--radius-md)]',
        'border border-dashed border-[var(--color-border)]',
        'text-sm text-[var(--color-text-muted)]'
      )}
    >
      {text}
    </div>
  );
}

function PendingSummaryCard({ approvedItems }: { approvedItems: WorkItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alacak Özeti</CardTitle>
      </CardHeader>
      <CardContent>
        {approvedItems.length === 0 ? (
          <EmptyPlaceholder text="Bekleyen ödeme yok" />
        ) : (
          <div className="space-y-2">
            {approvedItems.slice(0, 3).map((item) => (
              <div key={item.id} className={ROW_CLASS}>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {item.match_name || item.content_name || item.work_type}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(item.work_date).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <span className="font-mono text-sm font-medium text-[var(--color-warning)]">
                  {formatCurrency(item.cost || 0)}
                </span>
              </div>
            ))}
            {approvedItems.length > 3 && (
              <p className="text-center text-xs text-[var(--color-text-muted)]">
                +{approvedItems.length - 3} daha fazla
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PaymentRow {
  id: string;
  date: string;
  category: string;
  amount: number;
}

function RecentPaymentsCard({ payments }: { payments: PaymentRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Ödemeler</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyPlaceholder text="Henüz ödeme yapılmamış" />
        ) : (
          <div className="space-y-2">
            {payments.map((item) => (
              <div key={item.id} className={ROW_CLASS}>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {item.category}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(item.date).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <span className="font-mono text-sm font-medium text-[var(--color-success)]">
                  +{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function buildRecentPayments(
  userPayments: Payment[],
  expenseTransactions: Transaction[]
): PaymentRow[] {
  const paidPayments: PaymentRow[] = userPayments
    .filter((p) => p.status === 'PAID')
    .map((p) => ({ id: `payment-${p.id}`, date: p.payment_date, category: 'İş Ödemesi', amount: p.amount }));

  const txRows: PaymentRow[] = expenseTransactions.map((t) => ({
    id: `transaction-${t.id}`, date: t.transaction_date, category: t.category, amount: Number(t.amount),
  }));

  return [...paidPayments, ...txRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}
