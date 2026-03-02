/**
 * Payments Page
 * Lists all payments (Server Component)
 * Admin-only access (enforced by RLS)
 * Three tabs: Planned Payments (PENDING), Completed Payments (PAID), Realized Transactions
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { paymentService, userService, financeService, workItemService } from '@/services';
import { cn, formatDate, formatCurrency, getPaymentStatusBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { Plus } from 'lucide-react';
import { PaymentFilters } from './filters';
import { PaymentDeleteButton } from './delete-button';
import { PaymentsTabs } from './payments-tabs';
import { SelectablePaymentsTable } from './selectable-payments-table';
import { RealizedTransactionForm } from './realized-transaction-form';
import { RealizedTransactionsTable } from './realized-transactions-table';
import { UserPaymentsView } from './user-payments-view';
import type { Payment, PaymentStatus } from '@/types';

type TabType = 'planned' | 'completed' | 'realized';

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

interface PaymentsTableProps {
  payments: Payment[];
}

/**
 * Read-only payments table used for the "Yapılan Ödemeler" (Completed) tab
 */
function CompletedPaymentsTable({ payments }: PaymentsTableProps) {
  if (payments.length === 0) {
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
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.table.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment, index) => (
            <tr
              key={payment.id}
              className={cn(
                'border-b border-[var(--color-border)] last:border-b-0',
                index % 2 === 0
                  ? 'bg-[var(--color-table-row-even)]'
                  : 'bg-[var(--color-table-row-odd)]'
              )}
            >
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
              <td className="px-4 py-3 text-right">
                <PaymentDeleteButton paymentId={payment.id} />
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
    tab?: string;
    status?: string;
    user_id?: string;
    type?: string;
    category?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Determine active tab
  const tabParam = params.tab;
  const activeTab: TabType =
    tabParam === 'completed' ? 'completed' :
    tabParam === 'realized' ? 'realized' :
    'planned';

  // Get current user
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  // Non-admin user view: show their earnings
  if (!isAdmin) {
    const [paidWorkItems, approvedWorkItems, userPayments, userTransactions] = await Promise.all([
      workItemService.getAll({ user_id: currentUser.id, status: 'PAID' }),
      workItemService.getAll({ user_id: currentUser.id, status: 'APPROVED' }),
      paymentService.getByUserId(currentUser.id),
      financeService.getByUserId(currentUser.id),
    ]);

    return (
      <UserPaymentsView
        currentUser={currentUser}
        paidWorkItems={paidWorkItems}
        approvedWorkItems={approvedWorkItems}
        userPayments={userPayments}
        userTransactions={userTransactions}
      />
    );
  }

  // ---- Admin views below ----

  // Realized Transactions tab
  if (activeTab === 'realized') {
    const users = await userService.getAll();
    const transactions = await financeService.getAll();
    const financeStats = await financeService.getStats();

    return (
      <PageShell
        title={tr.pages.payments.title}
        description={tr.pages.payments.subtitle}
      >
        <PaymentsTabs activeTab={activeTab} />

        {/* Stats Summary for Realized Transactions */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Toplam İşlem</p>
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {financeStats.transactionCount}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">{tr.transaction.type.INCOME}</p>
            <p className="text-2xl font-semibold text-[var(--color-success)]">
              {formatCurrency(financeStats.totalIncome)}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">{tr.transaction.type.EXPENSE}</p>
            <p className="text-2xl font-semibold text-[var(--color-error)]">
              {formatCurrency(financeStats.totalExpenses)}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Net Bakiye</p>
            <p className={cn(
              'text-2xl font-semibold',
              financeStats.netBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            )}>
              {formatCurrency(financeStats.netBalance)}
            </p>
          </div>
        </div>

        {/* Add Transaction Form */}
        <div className="mb-6">
          <RealizedTransactionForm users={users} />
        </div>

        {/* Transactions Table */}
        <RealizedTransactionsTable transactions={transactions} />
      </PageShell>
    );
  }

  // Completed Payments tab (PAID only, read-only)
  if (activeTab === 'completed') {
    const users = await userService.getAll();

    const filters: { status: PaymentStatus; user_id?: string } = {
      status: 'PAID',
    };

    if (params.user_id) {
      filters.user_id = params.user_id;
    }

    const payments = await paymentService.getAll(filters);

    // Calculate stats from fetched data
    const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return (
      <PageShell
        title={tr.pages.payments.title}
        description={tr.pages.payments.subtitle}
      >
        <PaymentsTabs activeTab={activeTab} />

        {/* Stats Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Tamamlanan Ödeme</p>
            <p className="text-2xl font-semibold text-[var(--color-success)]">{payments.length}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Toplam Ödenen</p>
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {formatCurrency(totalPaidAmount)}
            </p>
          </div>
        </div>

        {/* User filter only (no status filter) */}
        <PaymentFilters
          currentUserId={params.user_id}
          users={users}
          showStatusFilter={false}
        />

        {/* Completed Payments Table */}
        <CompletedPaymentsTable payments={payments} />
      </PageShell>
    );
  }

  // Default: Planned Payments tab (PENDING only, with bulk select)
  const users = await userService.getAll();

  const filters: { status: PaymentStatus; user_id?: string } = {
    status: 'PENDING',
  };

  if (params.user_id) {
    filters.user_id = params.user_id;
  }

  const [payments, stats] = await Promise.all([
    paymentService.getAll(filters),
    paymentService.getStats(),
  ]);

  return (
    <PageShell
      title={tr.pages.payments.title}
      description={tr.pages.payments.subtitle}
      actions={
        <Link href="/work-items?status=APPROVED">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {tr.actions.addPayment}
          </Button>
        </Link>
      }
    >
      <PaymentsTabs activeTab={activeTab} />

      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">{tr.payment.status.PENDING}</p>
          <p className="text-2xl font-semibold text-[var(--color-warning)]">{stats.pending}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">{tr.payment.status.COMPLETED}</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{stats.paid}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam Ödenen</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {formatCurrency(stats.totalAmount)}
          </p>
        </div>
      </div>

      {/* User filter only (status is already fixed to PENDING) */}
      <PaymentFilters
        currentUserId={params.user_id}
        users={users}
        showStatusFilter={false}
      />

      {/* Selectable Payments Table with bulk pay */}
      <SelectablePaymentsTable payments={payments} />
    </PageShell>
  );
}
