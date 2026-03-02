/**
 * Admin Dashboard View
 * Shows overview stats for admin users: work items, payments, team members.
 */

import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  CreditCard,
  Users,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import type { WorkItem, User } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentStats {
  total: number;
  pending: number;
  paid: number;
  cancelled: number;
  totalAmount: number;
}

export interface DashboardAdminProps {
  allWorkItems: WorkItem[];
  allUsers: User[];
  paymentStats: PaymentStats;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardAdmin({
  allWorkItems,
  allUsers,
  paymentStats,
}: DashboardAdminProps) {
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thisMonthWorkItems = allWorkItems.filter((item) =>
    item.work_date.startsWith(thisMonth)
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
