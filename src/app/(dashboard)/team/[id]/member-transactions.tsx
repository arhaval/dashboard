/**
 * MemberTransactions
 * Displays a table of recent transactions for a team member.
 * Server component - no 'use client' needed.
 */

import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { PAGINATION } from '@/constants';
import { tr } from '@/lib/i18n';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { Transaction } from '@/types';

interface MemberTransactionsProps {
  transactions: Transaction[];
}

export function MemberTransactions({ transactions }: MemberTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
        Bu kullanıcıya ait işlem bulunamadı
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
              {tr.transaction.fields.description}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.amount}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, PAGINATION.DETAIL_PAGE_ITEMS).map((transaction, index) => (
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
                {transaction.description || '\u2014'}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
