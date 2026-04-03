/**
 * Finance Page
 * Shows financial summary and transaction history — Admin only.
 * Features: monthly trend chart, category breakdown donut, StatCards, table.
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { MonthlyTrendChart, CategoryDonut } from '@/components/charts/finance-charts';
import { financeService, userService } from '@/services';
import { getCurrentMonth, getNextMonthStart } from '@/services/finance.service';
import { cn, formatDate, formatCurrency, getTransactionTypeLabel, getTransactionTypeBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { TRANSACTION_TYPES } from '@/constants';
import { FinanceFilters } from './filters';
import { FinanceMonthPicker } from './month-picker';
import { FinanceExportButtons } from './export-buttons';
import { TransactionDeleteButton } from './delete-button';
import { TrendingUp, TrendingDown, Scale, Hash } from 'lucide-react';
import type { Transaction, TransactionType } from '@/types';

// ─────────────────────────────────────────────
// Transaction Table
// ─────────────────────────────────────────────

function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.table.noData}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]" style={{ boxShadow: 'var(--shadow-card)' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {tr.transaction.fields.date}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {tr.transaction.fields.type}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {tr.transaction.fields.category}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {tr.transaction.fields.description}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {tr.transaction.fields.amount}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {tr.table.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr
              key={transaction.id}
              className={cn(
                'border-b border-[var(--color-border)] last:border-b-0 transition-colors hover:bg-[var(--color-bg-tertiary)]',
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
                    'inline-block rounded-full px-2.5 py-0.5',
                    'text-xs font-medium',
                    getTransactionTypeBadgeClass(transaction.type)
                  )}
                >
                  {getTransactionTypeLabel(transaction.type)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">
                {transaction.category}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {transaction.description || '—'}
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right font-mono text-sm font-semibold',
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

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    month?: string;
  }>;
}

export default async function FinancePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  // Determine active month
  const availableMonthsList = await financeService.getAvailableMonths();
  const activeMonth =
    params.month ||
    (availableMonthsList.length > 0 ? availableMonthsList[0] : getCurrentMonth());

  // Build filters
  const filters: {
    type?: TransactionType;
    category?: string;
    date_from?: string;
    date_before?: string;
  } = {
    date_from: `${activeMonth}-01`,
    date_before: getNextMonthStart(activeMonth),
  };

  if (params.type && (TRANSACTION_TYPES as readonly string[]).includes(params.type)) {
    filters.type = params.type as TransactionType;
  }
  if (params.category) filters.category = params.category;

  // Fetch all data in parallel
  const [transactions, stats, categories, trendData, expenseBreakdown, incomeBreakdown] =
    await Promise.all([
      financeService.getAll(filters),
      financeService.getStatsByMonth(activeMonth),
      financeService.getCategories(),
      financeService.getMonthlyTrend(6),
      financeService.getCategoryBreakdown(activeMonth, 'EXPENSE'),
      financeService.getCategoryBreakdown(activeMonth, 'INCOME'),
    ]);

  // Map trend data for the chart component
  const chartTrendData = trendData.map((d) => ({
    month: d.label,
    income: d.income,
    expense: d.expense,
  }));

  return (
    <PageShell
      title={tr.pages.finance.title}
      description={tr.pages.finance.subtitle}
      actions={
        <div className="flex items-center gap-3">
          <FinanceExportButtons
            transactions={transactions}
            stats={stats}
            currentMonth={activeMonth}
          />
          <FinanceMonthPicker months={availableMonthsList} currentMonth={activeMonth} />
        </div>
      }
    >
      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Gelir"
          value={formatCurrency(stats.totalIncome)}
          description={activeMonth}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Toplam Gider"
          value={formatCurrency(stats.totalExpenses)}
          description={activeMonth}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Net Bakiye"
          value={formatCurrency(stats.netBalance)}
          description={stats.netBalance >= 0 ? 'Kârlı ay' : 'Zararlı ay'}
          icon={Scale}
          color={stats.netBalance >= 0 ? 'teal' : 'orange'}
        />
        <StatCard
          title="İşlem Sayısı"
          value={stats.transactionCount.toString()}
          description="Bu ay toplam kayıt"
          icon={Hash}
          color="blue"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Monthly Trend — takes 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
              Aylık Gelir / Gider Trendi
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">Son 6 aylık karşılaştırma</p>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={chartTrendData} />
          </CardContent>
        </Card>

        {/* Category Breakdown — takes 1/3 width */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
              Gider Dağılımı
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">
              {activeMonth} — kategoriye göre
            </p>
          </CardHeader>
          <CardContent>
            <CategoryDonut
              data={expenseBreakdown}
              total={stats.totalExpenses}
              label="Kategoriler"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Gelir Dağılımı (eğer veri varsa) ── */}
      {incomeBreakdown.length > 1 && (
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Gelir Dağılımı
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                {activeMonth} — kaynak bazlı
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <CategoryDonut
                  data={incomeBreakdown}
                  total={stats.totalIncome}
                  label="Gelir kaynakları"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Filters + Table ── */}
      <div className="mt-6">
        <FinanceFilters
          currentType={params.type}
          currentCategory={params.category}
          currentMonth={activeMonth}
          categories={categories}
        />
        <div className="mt-4">
          <TransactionsTable transactions={transactions} />
        </div>
      </div>
    </PageShell>
  );
}
