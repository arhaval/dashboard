/**
 * Dashboard Home Page
 * Main landing page after login
 * Shows overview stats based on user role
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  CreditCard,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { userService, workItemService, paymentService, financeService } from '@/services';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

export default async function DashboardPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  if (isAdmin) {
    // Admin Dashboard - overview of everything
    const [allWorkItems, allUsers, paymentStats] = await Promise.all([
      workItemService.getAll(),
      userService.getAll(),
      paymentService.getStats(),
    ]);

    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const thisMonthWorkItems = allWorkItems.filter(
      (item) => item.work_date.startsWith(thisMonth)
    );
    const activeUsers = allUsers.filter((u) => u.is_active && u.role !== 'ADMIN');

    const stats = [
      {
        title: tr.dashboard.totalWorkItems,
        value: thisMonthWorkItems.length.toString(),
        description: tr.dashboard.thisMonth,
        icon: FileText,
        color: 'text-[var(--color-text-primary)]',
      },
      {
        title: tr.dashboard.pendingPayments,
        value: paymentStats.pending.toString(),
        description: tr.dashboard.awaitingProcessing,
        icon: CreditCard,
        color: 'text-[var(--color-warning)]',
      },
      {
        title: tr.dashboard.teamMembers,
        value: activeUsers.length.toString(),
        description: tr.dashboard.activeUsers,
        icon: Users,
        color: 'text-[var(--color-text-primary)]',
      },
      {
        title: 'Toplam Ödenen',
        value: formatCurrency(paymentStats.totalAmount),
        description: 'Tüm zamanlar',
        icon: TrendingUp,
        color: 'text-[var(--color-success)]',
      },
    ];

    return (
      <PageShell title={tr.dashboard.title} description={tr.dashboard.subtitle}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
                </CardHeader>
                <CardContent>
                  <div className={cn('text-2xl font-semibold', stat.color)}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{tr.dashboard.recentActivity}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'flex h-32 items-center justify-center',
                  'rounded-[var(--radius-md)]',
                  'border border-dashed border-[var(--color-border)]',
                  'text-sm text-[var(--color-text-muted)]'
                )}
              >
                {tr.dashboard.activityPlaceholder}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr.dashboard.quickActions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'flex h-32 items-center justify-center',
                  'rounded-[var(--radius-md)]',
                  'border border-dashed border-[var(--color-border)]',
                  'text-sm text-[var(--color-text-muted)]'
                )}
              >
                {tr.dashboard.quickActionsPlaceholder}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  // Non-Admin (Team Member) Dashboard
  const [userWorkItems, userPayments, userTransactions] = await Promise.all([
    workItemService.getAll({ user_id: currentUser.id }),
    paymentService.getByUserId(currentUser.id),
    financeService.getByUserId(currentUser.id),
  ]);

  // Calculate stats
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthWorkItems = userWorkItems.filter((item) =>
    item.work_date.startsWith(thisMonth)
  );

  const draftItems = userWorkItems.filter((item) => item.status === 'DRAFT');
  const approvedItems = userWorkItems.filter((item) => item.status === 'APPROVED');
  const paidItems = userWorkItems.filter((item) => item.status === 'PAID');

  // Earnings from work items
  const totalEarnedFromWorkItems = paidItems.reduce((sum, item) => sum + (item.cost || 0), 0);
  const pendingAmount = approvedItems.reduce((sum, item) => sum + (item.cost || 0), 0);

  // Earnings from transactions (admin-added payments)
  const userExpenseTransactions = userTransactions.filter(t => t.type === 'EXPENSE');
  const totalFromTransactions = userExpenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // Total earned = work items + transactions
  const totalEarned = totalEarnedFromWorkItems + totalFromTransactions;
  const totalPaidCount = paidItems.length + userExpenseTransactions.length;

  const stats = [
    {
      title: 'Bu Ay İş Kaydı',
      value: thisMonthWorkItems.length.toString(),
      description: 'Bu ay eklenen işler',
      icon: FileText,
      color: 'text-[var(--color-text-primary)]',
    },
    {
      title: 'Bekleyen Onay',
      value: draftItems.length.toString(),
      description: 'Taslak durumunda',
      icon: Clock,
      color: 'text-[var(--color-warning)]',
    },
    {
      title: 'Alacak',
      value: formatCurrency(pendingAmount),
      description: `${approvedItems.length} onaylı iş`,
      icon: Wallet,
      color: 'text-[var(--color-warning)]',
    },
    {
      title: 'Toplam Kazanç',
      value: formatCurrency(totalEarned),
      description: `${totalPaidCount} ödenen iş`,
      icon: CheckCircle,
      color: 'text-[var(--color-success)]',
    },
  ];

  return (
    <PageShell
      title={tr.dashboard.title}
      description="Kişisel iş ve ödeme durumunuz"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-semibold', stat.color)}>
                  {stat.value}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Alacak Özeti */}
        <Card>
          <CardHeader>
            <CardTitle>Alacak Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedItems.length === 0 ? (
              <div
                className={cn(
                  'flex h-32 items-center justify-center',
                  'rounded-[var(--radius-md)]',
                  'border border-dashed border-[var(--color-border)]',
                  'text-sm text-[var(--color-text-muted)]'
                )}
              >
                Bekleyen ödeme yok
              </div>
            ) : (
              <div className="space-y-2">
                {approvedItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {item.match_name || item.content_name || item.work_type}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(item.work_date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-medium text-[var(--color-warning)]">
                      {formatCurrency(item.cost || 0)}
                    </span>
                  </div>
                ))}
                {approvedItems.length > 3 && (
                  <p className="text-center text-xs text-[var(--color-text-muted)]">
                    +{approvedItems.length - 3} daha fazla
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Son Ödemeler */}
        <Card>
          <CardHeader>
            <CardTitle>Son Ödemeler</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Combine payments and transactions, sort by date
              const paidPayments = userPayments
                .filter((p) => p.status === 'PAID')
                .map((p) => ({
                  id: `payment-${p.id}`,
                  date: p.payment_date,
                  category: 'İş Ödemesi',
                  amount: p.amount,
                  type: 'payment' as const,
                }));

              const expenseTransactions = userExpenseTransactions.map((t) => ({
                id: `transaction-${t.id}`,
                date: t.transaction_date,
                category: t.category,
                amount: Number(t.amount),
                type: 'transaction' as const,
              }));

              const allPayments = [...paidPayments, ...expenseTransactions]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);

              if (allPayments.length === 0) {
                return (
                  <div
                    className={cn(
                      'flex h-32 items-center justify-center',
                      'rounded-[var(--radius-md)]',
                      'border border-dashed border-[var(--color-border)]',
                      'text-sm text-[var(--color-text-muted)]'
                    )}
                  >
                    Henüz ödeme yapılmamış
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {allPayments.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {item.category}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {new Date(item.date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-medium text-[var(--color-success)]">
                        +{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
