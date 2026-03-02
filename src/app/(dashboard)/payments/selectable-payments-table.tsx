/**
 * Selectable Payments Table
 * Client component with checkbox selection and bulk pay functionality
 * Used on the "Planlanan Ödemeler" (Planned Payments) tab
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatDate, formatCurrency, getPaymentStatusBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { bulkMarkPaymentsAsPaid, markPaymentAsPaid, cancelPayment } from './actions';
import { PaymentActions } from './payment-actions';
import { PaymentDeleteButton } from './delete-button';
import type { Payment } from '@/types';

function getWorkItemsSummary(payment: Payment): string {
  if (!payment.payment_items || payment.payment_items.length === 0) {
    return '—';
  }

  const items = payment.payment_items;
  if (items.length === 1) {
    const item = items[0].work_item;
    return item?.match_name || item?.content_name || 'Work Item';
  }

  return `${items.length} iş kalemi`;
}

interface SelectablePaymentsTableProps {
  payments: Payment[];
}

export function SelectablePaymentsTable({ payments }: SelectablePaymentsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkPaying, setIsBulkPaying] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<{ paidCount: number; failedCount: number } | null>(null);

  const pendingPayments = payments.filter((p) => p.status === 'PENDING');
  const allSelected = pendingPayments.length > 0 && pendingPayments.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingPayments.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkPay = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkPaying(true);
    setBulkResult(null);

    const result = await bulkMarkPaymentsAsPaid(Array.from(selectedIds));

    setBulkResult({ paidCount: result.paidCount, failedCount: result.failedCount });
    setSelectedIds(new Set());
    setIsBulkPaying(false);

    // Auto-clear result message after 3 seconds
    setTimeout(() => setBulkResult(null), 3000);
  };

  if (payments.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.table.noData}</p>
      </div>
    );
  }

  const checkboxClassName = cn(
    'h-4 w-4 rounded-[2px] cursor-pointer',
    'accent-[var(--color-accent)]'
  );

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className={checkboxClassName}
                  title={tr.actions.selectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.payment.fields.date}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.payment.fields.user}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.payment.fields.items}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.payment.fields.amount}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.payment.fields.status}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.table.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => {
              const isPending = payment.status === 'PENDING';
              const isChecked = selectedIds.has(payment.id);

              return (
                <tr
                  key={payment.id}
                  className={cn(
                    'border-b border-[var(--color-border)] last:border-b-0',
                    index % 2 === 0
                      ? 'bg-[var(--color-table-row-even)]'
                      : 'bg-[var(--color-table-row-odd)]',
                    isChecked && 'bg-[var(--color-accent-muted)]'
                  )}
                >
                  <td className="w-10 px-4 py-3">
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(payment.id)}
                        className={checkboxClassName}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                    {payment.user?.full_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    {getWorkItemsSummary(payment)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-text-primary)]">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5',
                        'text-xs font-medium',
                        getPaymentStatusBadgeClass(payment.status)
                      )}
                    >
                      {payment.status === 'PENDING' ? tr.payment.status.PENDING :
                       payment.status === 'PAID' ? tr.payment.status.COMPLETED :
                       tr.payment.status.CANCELLED}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <PaymentActions paymentId={payment.id} status={payment.status} />
                      <PaymentDeleteButton paymentId={payment.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className={cn(
            'flex items-center gap-4 rounded-[var(--radius-md)]',
            'border border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
            'px-6 py-3 shadow-lg'
          )}>
            <span className="text-sm text-[var(--color-text-primary)]">
              {selectedIds.size} ödeme seçildi
            </span>
            <button
              onClick={handleBulkPay}
              disabled={isBulkPaying}
              className={cn(
                'rounded-[var(--radius-sm)] px-4 py-2',
                'text-sm font-medium text-white',
                'bg-[var(--color-success)] hover:bg-[var(--color-success)]/90',
                'transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isBulkPaying ? 'İşleniyor...' : tr.actions.bulkPay}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={cn(
                'rounded-[var(--radius-sm)] px-3 py-2',
                'text-sm text-[var(--color-text-muted)]',
                'hover:text-[var(--color-text-primary)]',
                'transition-colors'
              )}
            >
              {tr.actions.clear}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Result Feedback */}
      {bulkResult && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className={cn(
            'rounded-[var(--radius-md)] px-6 py-3',
            'border border-[var(--color-border)]',
            bulkResult.failedCount === 0
              ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
              : 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
            'text-sm font-medium'
          )}>
            {bulkResult.paidCount} ödeme başarıyla tamamlandı
            {bulkResult.failedCount > 0 && `, ${bulkResult.failedCount} başarısız`}
          </div>
        </div>
      )}
    </>
  );
}
