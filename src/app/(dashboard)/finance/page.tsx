/**
 * Finance Page
 * Shows financial summary and transaction history
 * Admin-only access (enforced by RLS)
 * Grouped by month with month picker
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { financeService, userService } from '@/services';
import { getCurrentMonth } from '@/services/finance.service';
import { cn, formatDate, formatCurrency, getTransactionTypeLabel, getTransactionTypeBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { TRANSACTION_TYPES } from '@/constants';
import { FinanceFilters } from './filters';
import { FinanceMonthPicker } from './month-picker';
import { TransactionDeleteButton } from './delete-button';
import type { Transaction, TransactionType } from '@/types';

interface TransactionsTableProps {
  transactions: Transaction[];
}

function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.table.noData}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.date}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.type}
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
              <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                {formatDate(transaction.transaction_date)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5',
                    'text-xs font-medium',
                    getTransactionTypeBadgeClass(transaction.type)
                  )}
                >
                  {getTransactionTypeLabel(transaction.type)}
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
              <td className="px-4 py-3 text-right">
                {!transaction.payment_id && (
                  <TransactionDeleteButton transactionId={transaction.id} />
                )}
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
    month?: string;
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

  // Determine active month
  // If no month param, prefer the most recent month with data (fallback to current month)
  const availableMonthsList = await financeService.getAvailableMonths();
  const activeMonth = params.month || (availableMonthsList.length > 0 ? availableMonthsList[0] : getCurrentMonth());

  // Build filters from search params
  const filters: {
    type?: TransactionType;
    category?: string;
    date_from?: string;
    date_to?: string;
  } = {
    date_from: `${activeMonth}-01`,
    date_to: `${activeMonth}-31`,
  };

  if (params.type && (TRANSACTION_TYPES as readonly string[]).includes(params.type)) {
    filters.type = params.type as TransactionType;
  }

  if (params.category) {
    filters.category = params.category;
  }

  // Fetch data (availableMonths already fetched above)
  const [transactions, stats, categories] = await Promise.all([
    financeService.getAll(filters),
    financeService.getStatsByMonth(activeMonth),
    financeService.getCategories(),
  ]);
  const availableMonths = availableMonthsList;

  return (
    <PageShell
      title={tr.pages.finance.title}
      description={tr.pages.finance.subtitle}
      actions={
        <FinanceMonthPicker months={availableMonths} currentMonth={activeMonth} />
      }
    >
      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam {tr.transaction.type.INCOME}</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">
            {formatCurrency(stats.totalIncome)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam {tr.transaction.type.EXPENSE}</p>
          <p className="text-2xl font-semibold text-[var(--color-error)]">
            {formatCurrency(stats.totalExpenses)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Net Bakiye</p>
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
          <p className="text-sm text-[var(--color-text-muted)]">İşlem Sayısı</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {stats.transactionCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FinanceFilters
        currentType={params.type}
        currentCategory={params.category}
        currentMonth={activeMonth}
        categories={categories}
      />

      {/* Transactions Table */}
      <TransactionsTable transactions={transactions} />
    </PageShell>
  );
}
