'use client';

/**
 * Realized Transactions Table
 * Shows list of manual income/expense transactions
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { deleteRealizedTransaction } from './realized-actions';
import type { Transaction } from '@/types';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

interface DeleteButtonProps {
  transactionId: string;
}

function DeleteButton({ transactionId }: DeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteRealizedTransaction(transactionId);
      if (!result.error) {
        router.refresh();
      }
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className={cn(
            'px-2 py-1 text-xs rounded',
            'bg-[var(--color-error)] text-white',
            'hover:bg-[var(--color-error)]/90',
            isPending && 'opacity-50'
          )}
        >
          {isPending ? '...' : tr.confirm.yes}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-2 py-1 text-xs rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
        >
          {tr.actions.cancel}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={cn(
        'inline-flex items-center justify-center',
        'h-8 w-8 rounded-[var(--radius-sm)]',
        'text-[var(--color-text-muted)]',
        'hover:bg-[var(--color-error-muted)] hover:text-[var(--color-error)]',
        'transition-colors'
      )}
      title={tr.actions.delete}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

interface RealizedTransactionsTableProps {
  transactions: Transaction[];
}

export function RealizedTransactionsTable({ transactions }: RealizedTransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.payment.realized.noTransactions}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.type}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.date}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.category}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.payment.fields.user}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.description}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.amount}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.table.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr
              key={transaction.id}
              className={cn(
                'border-b border-[var(--color-border)] last:border-b-0',
                index % 2 === 0
                  ? 'bg-[var(--color-table-row-even)]'
                  : 'bg-[var(--color-table-row-odd)]'
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {transaction.type === 'INCOME' ? (
                    <ArrowUpCircle className="h-4 w-4 text-[var(--color-success)]" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-[var(--color-error)]" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      transaction.type === 'INCOME'
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-error)]'
                    )}
                  >
                    {transaction.type === 'INCOME'
                      ? tr.transaction.type.INCOME
                      : tr.transaction.type.EXPENSE}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                {formatDate(transaction.transaction_date)}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                {transaction.category}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {transaction.user?.full_name || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {transaction.description || '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className={cn(
                    'font-mono text-sm font-medium',
                    transaction.type === 'INCOME'
                      ? 'text-[var(--color-success)]'
                      : 'text-[var(--color-error)]'
                  )}
                >
                  {transaction.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton transactionId={transaction.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
