/**
 * Payments Page
 * Lists all payments (Server Component)
 * Admin-only access (enforced by RLS)
 * Two tabs: Planned Payments & Realized Transactions
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { paymentService, userService, financeService } from '@/services';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { Plus } from 'lucide-react';
import { PaymentFilters } from './filters';
import { PaymentActions } from './payment-actions';
import { PaymentDeleteButton } from './delete-button';
import { PaymentsTabs } from './payments-tabs';
import { RealizedTransactionForm } from './realized-transaction-form';
import { RealizedTransactionsTable } from './realized-transactions-table';
import type { Payment, PaymentStatus } from '@/types';

function getStatusBadgeStyles(status: PaymentStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]';
    case 'PAID':
      return 'bg-[var(--color-success-muted)] text-[var(--color-success)]';
    case 'CANCELLED':
      return 'bg-[var(--color-error-muted)] text-[var(--color-error)]';
    default:
      return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  }
}

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

interface PaymentsTableProps {
  payments: Payment[];
}

function PaymentsTable({ payments }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.table.noData}</p>
        <Link href="/work-items?status=APPROVED">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Onaylı İşleri Görüntüle
          </Button>
        </Link>
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
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.payment.fields.status}
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
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5',
                    'text-xs font-medium',
                    getStatusBadgeStyles(payment.status)
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
  const activeTab = params.tab === 'realized' ? 'realized' : 'planned';

  // Get current user and verify admin access
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch users (needed for both tabs)
  const users = await userService.getAll();

  // Conditional data fetch based on active tab
  if (activeTab === 'realized') {
    // Fetch transactions for realized tab
    const transactions = await financeService.getAll();
    const financeStats = await financeService.getStats();

    return (
      <PageShell
        title={tr.pages.payments.title}
        description={tr.pages.payments.subtitle}
      >
        {/* Tabs */}
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

  // Default: Planned Payments tab
  // Build filters from search params
  const filters: {
    status?: PaymentStatus;
    user_id?: string;
  } = {};

  if (params.status && ['PENDING', 'PAID', 'CANCELLED'].includes(params.status)) {
    filters.status = params.status as PaymentStatus;
  }

  if (params.user_id) {
    filters.user_id = params.user_id;
  }

  // Fetch data for planned payments
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
      {/* Tabs */}
      <PaymentsTabs activeTab={activeTab} />

      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.total}</p>
        </div>
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

      {/* Filters */}
      <PaymentFilters
        currentStatus={params.status}
        currentUserId={params.user_id}
        users={users}
      />

      {/* Payments Table */}
      <PaymentsTable payments={payments} />
    </PageShell>
  );
}
