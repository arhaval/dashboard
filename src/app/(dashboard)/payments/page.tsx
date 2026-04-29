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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { paymentService, userService, financeService, workItemService } from '@/services';
import { cn, formatDate, formatCurrency, getPaymentStatusBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { Plus, Clock, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react';
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
      <div className="overflow-x-auto">
      <table className="w-full min-w-[460px]">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
              {tr.payment.fields.date}
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
              {tr.payment.fields.user}
            </th>
            <th className="hidden px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:table-cell sm:px-4">
              {tr.payment.fields.items}
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
              {tr.payment.fields.amount}
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
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
              <td className="px-3 py-3 text-xs text-[var(--color-text-muted)] sm:px-4 sm:text-sm">
                {formatDate(payment.payment_date)}
              </td>
              <td className="px-3 py-3 text-xs text-[var(--color-text-primary)] sm:px-4 sm:text-sm">
                {payment.user?.full_name || '—'}
              </td>
              <td className="hidden px-3 py-3 text-xs text-[var(--color-text-secondary)] sm:table-cell sm:px-4 sm:text-sm">
                {getWorkItemsSummary(payment)}
              </td>
              <td className="px-3 py-3 text-right text-xs font-mono text-[var(--color-text-primary)] sm:px-4 sm:text-sm">
                {formatCurrency(payment.amount)}
              </td>
              <td className="px-3 py-3 text-right sm:px-4">
                <PaymentDeleteButton paymentId={payment.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
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
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Toplam İşlem" value={financeStats.transactionCount.toString()} description="Kayıtlı işlem" icon={CheckCircle2} color="blue" />
          <StatCard title="Gelir" value={formatCurrency(financeStats.totalIncome)} description="Toplam" icon={TrendingUp} color="green" />
          <StatCard title="Gider" value={formatCurrency(financeStats.totalExpenses)} description="Toplam" icon={DollarSign} color="red" />
          <StatCard title="Net Bakiye" value={formatCurrency(financeStats.netBalance)} description={financeStats.netBalance >= 0 ? 'Kârlı' : 'Zararlı'} icon={DollarSign} color={financeStats.netBalance >= 0 ? 'teal' : 'orange'} />
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
          <StatCard title="Tamamlanan Ödeme" value={payments.length.toString()} description="Tüm zamanlar" icon={CheckCircle2} color="green" />
          <StatCard title="Toplam Ödenen" value={formatCurrency(totalPaidAmount)} description="Kümülatif" icon={DollarSign} color="blue" />
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

      {/* ── Stat Cards ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Bekleyen Ödeme"
          value={stats.pending.toString()}
          description="İşlem bekliyor"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Tamamlanan"
          value={stats.paid.toString()}
          description="Ödenmiş"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Toplam Ödenen"
          value={formatCurrency(stats.totalAmount)}
          description="Tüm zamanlar"
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Bu Sefer Ödenecek"
          value={formatCurrency(payments.reduce((s, p) => s + (p.amount || 0), 0))}
          description={`${payments.length} ödeme seçili`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* ── Per-User Breakdown ── */}
      {payments.length > 0 && (() => {
        const byUser = new Map<string, { name: string; amount: number; count: number }>();
        for (const p of payments) {
          const key = p.user_id;
          const ex = byUser.get(key) ?? { name: p.user?.full_name ?? '—', amount: 0, count: 0 };
          ex.amount += p.amount || 0;
          ex.count += 1;
          byUser.set(key, ex);
        }
        const userList = Array.from(byUser.values()).sort((a, b) => b.amount - a.amount);

        return (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Kişi Bazlı Ödeme Özeti
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">Bekleyen ödemeler kişiye göre</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userList.map((u) => {
                  const maxAmount = userList[0].amount;
                  const pct = maxAmount > 0 ? Math.round((u.amount / maxAmount) * 100) : 0;
                  return (
                    <div key={u.name}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{u.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[var(--color-text-muted)]">{u.count} ödeme</span>
                          <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
                            {formatCurrency(u.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* User filter */}
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
