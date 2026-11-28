/**
 * Finans hareketleri tablosu — gerçekleşen gelir/gider kayıtları.
 * Ödemeye bağlı kayıtlar (payment_id) buradan silinemez; ödemeden yönetilir.
 */

import { cn, formatDate, formatCurrency, getTransactionTypeLabel, getTransactionTypeBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { TransactionDeleteButton } from './delete-button';
import type { Transaction } from '@/types';

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.table.noData}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: one card per transaction */}
      <div className="space-y-3 md:hidden">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {transaction.category}
                </p>
                {transaction.description && (
                  <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                    {transaction.description}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {formatDate(transaction.transaction_date)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getTransactionTypeBadgeClass(transaction.type))}>
                  {getTransactionTypeLabel(transaction.type)}
                </span>
                <span className={cn('font-mono text-sm font-semibold', transaction.type === 'INCOME' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]')}>
                  {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
            {!transaction.payment_id && (
              <div className="mt-2 flex justify-end border-t border-[var(--color-border)] pt-2">
                <TransactionDeleteButton transactionId={transaction.id} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:px-4">
                {tr.transaction.fields.date}
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:px-4">
                {tr.transaction.fields.type}
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:px-4">
                {tr.transaction.fields.category}
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:table-cell sm:px-4">
                {tr.transaction.fields.description}
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:px-4">
                {tr.transaction.fields.amount}
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:px-4">
                {tr.table.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-colors last:border-b-0 hover:bg-[var(--color-bg-tertiary)]"
              >
                <td className="px-3 py-3 text-xs text-[var(--color-text-muted)] sm:px-4 sm:text-sm">
                  {formatDate(transaction.transaction_date)}
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', getTransactionTypeBadgeClass(transaction.type))}>
                    {getTransactionTypeLabel(transaction.type)}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs font-medium text-[var(--color-text-primary)] sm:px-4 sm:text-sm">
                  {transaction.category}
                </td>
                <td className="hidden px-3 py-3 text-xs text-[var(--color-text-secondary)] sm:table-cell sm:px-4 sm:text-sm">
                  {transaction.description || '—'}
                </td>
                <td className={cn('px-3 py-3 text-right font-mono text-xs font-semibold sm:px-4 sm:text-sm', transaction.type === 'INCOME' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]')}>
                  {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </td>
                <td className="px-3 py-3 text-right sm:px-4">
                  {!transaction.payment_id && (
                    <TransactionDeleteButton transactionId={transaction.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
