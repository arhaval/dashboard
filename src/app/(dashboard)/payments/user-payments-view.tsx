/**
 * UserPaymentsView Component
 * Non-admin user view for viewing their earnings and pending payments.
 * Extracted from payments/page.tsx for modularity.
 */

import { formatDate, formatCurrency, getWorkTypeLabel, cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { ArrowUpCircle } from 'lucide-react';
import { PageShell } from '@/components/layout';
import type { User, WorkItem, Payment, Transaction } from '@/types';

interface UserPaymentsViewProps {
  currentUser: User;
  paidWorkItems: WorkItem[];
  approvedWorkItems: WorkItem[];
  userPayments: Payment[];
  userTransactions: Transaction[];
}

function getWorkItemsSummary(payment: Payment): string {
  if (!payment.payment_items || payment.payment_items.length === 0) {
    return '—';
  }

  const items = payment.payment_items;
  if (items.length === 1) {
    const item = items[0].work_item;
    return item?.match_name || item?.content_name || 'Work Item';
  }

  return `${items.length} work items`;
}

export function UserPaymentsView({
  paidWorkItems,
  approvedWorkItems,
  userPayments,
  userTransactions,
}: UserPaymentsViewProps) {
  // Calculate totals from work items
  const totalPaidFromWorkItems = paidWorkItems.reduce((sum, item) => sum + (item.cost || 0), 0);
  const totalPending = approvedWorkItems.reduce((sum, item) => sum + (item.cost || 0), 0);
  const paidPaymentsList = userPayments.filter(p => p.status === 'PAID');

  // Calculate totals from transactions (admin's realized transactions)
  const userExpenseTransactions = userTransactions.filter(t => t.type === 'EXPENSE');
  const totalFromTransactions = userExpenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // Total paid = payments + transactions
  const totalPaid = totalPaidFromWorkItems + totalFromTransactions;

  return (
    <PageShell
      title={tr.pages.payments.title}
      description="Ödeme durumunuzu görüntüleyin"
    >
      {/* Stats Summary - User's earnings */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam Ödenen</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">
            {formatCurrency(totalPaid)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{paidWorkItems.length} iş kalemi</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Alacak (Bekleyen)</p>
          <p className="text-2xl font-semibold text-[var(--color-warning)]">
            {formatCurrency(totalPending)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{approvedWorkItems.length} onaylı iş</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam Kazanç</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {formatCurrency(totalPaid + totalPending)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">Ödenen + Alacak</p>
        </div>
      </div>

      {/* Alacak Section - Approved but not paid */}
      {approvedWorkItems.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
            Alacak (Onaylandı, Ödeme Bekliyor)
          </h3>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">Tarih</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">İş Türü</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">Açıklama</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {approvedWorkItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-[var(--color-border)] last:border-b-0',
                      index % 2 === 0 ? 'bg-[var(--color-table-row-even)]' : 'bg-[var(--color-table-row-odd)]'
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {formatDate(item.work_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      {getWorkTypeLabel(item.work_type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {item.match_name || item.content_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-medium text-[var(--color-warning)]">
                      {formatCurrency(item.cost || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ödenen Section - Paid payments + Transactions */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
          Ödenen (Tamamlanan Ödemeler)
        </h3>
        {paidPaymentsList.length === 0 && userExpenseTransactions.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
            Henüz ödeme yapılmamış
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">Tarih</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">Kategori</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">Açıklama</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {/* Payments (work item payments) */}
                {paidPaymentsList.map((payment, index) => (
                  <tr
                    key={`payment-${payment.id}`}
                    className={cn(
                      'border-b border-[var(--color-border)] last:border-b-0',
                      index % 2 === 0 ? 'bg-[var(--color-table-row-even)]' : 'bg-[var(--color-table-row-odd)]'
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      İş Ödemesi
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {getWorkItemsSummary(payment)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ArrowUpCircle className="h-4 w-4 text-[var(--color-success)]" />
                        <span className="font-mono text-sm font-medium text-[var(--color-success)]">
                          +{formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Transactions (admin-added realized transactions) */}
                {userExpenseTransactions.map((transaction, index) => (
                  <tr
                    key={`transaction-${transaction.id}`}
                    className={cn(
                      'border-b border-[var(--color-border)] last:border-b-0',
                      (paidPaymentsList.length + index) % 2 === 0 ? 'bg-[var(--color-table-row-even)]' : 'bg-[var(--color-table-row-odd)]'
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      {transaction.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {transaction.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ArrowUpCircle className="h-4 w-4 text-[var(--color-success)]" />
                        <span className="font-mono text-sm font-medium text-[var(--color-success)]">
                          +{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
