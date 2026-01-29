/**
 * Finance Page
 * Shows financial summary and transaction history
 * Admin-only access (enforced by RLS)
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { financeService, userService } from '@/services';
import { cn } from '@/lib/utils';
import { FinanceFilters } from './filters';
import type { Transaction, TransactionType } from '@/types';

function getTypeBadgeStyles(type: TransactionType) {
  switch (type) {
    case 'INCOME':
      return 'bg-[var(--color-success-muted)] text-[var(--color-success)]';
    case 'EXPENSE':
      return 'bg-[var(--color-error-muted)] text-[var(--color-error)]';
    default:
      return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
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

interface TransactionsTableProps {
  transactions: Transaction[];
}

function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Category
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Description
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              Amount
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
              <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                {formatDate(transaction.transaction_date)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5',
                    'text-xs font-medium',
                    getTypeBadgeStyles(transaction.type)
                  )}
                >
                  {transaction.type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                {transaction.category}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {transaction.description || '—'}
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right text-sm font-mono',
                  transaction.type === 'INCOME'
                    ? 'text-[var(--color-success)]'
                    : 'text-[var(--color-error)]'
                )}
              >
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
  }>;
}

export default async function FinancePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Get current user and verify admin access
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  // Build filters from search params
  const filters: {
    type?: TransactionType;
    category?: string;
  } = {};

  if (params.type && ['INCOME', 'EXPENSE'].includes(params.type)) {
    filters.type = params.type as TransactionType;
  }

  if (params.category) {
    filters.category = params.category;
  }

  // Fetch data
  const [transactions, stats, categories] = await Promise.all([
    financeService.getAll(filters),
    financeService.getStats(),
    financeService.getCategories(),
  ]);

  return (
    <PageShell title="Finance" description="Income and expense ledger">
      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Total Income</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">
            {formatCurrency(stats.totalIncome)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Total Expenses</p>
          <p className="text-2xl font-semibold text-[var(--color-error)]">
            {formatCurrency(stats.totalExpenses)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Net Balance</p>
          <p
            className={cn(
              'text-2xl font-semibold',
              stats.netBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            )}
          >
            {formatCurrency(stats.netBalance)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Transactions</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {stats.transactionCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FinanceFilters
        currentType={params.type}
        currentCategory={params.category}
        categories={categories}
      />

      {/* Transactions Table */}
      <TransactionsTable transactions={transactions} />
    </PageShell>
  );
}
