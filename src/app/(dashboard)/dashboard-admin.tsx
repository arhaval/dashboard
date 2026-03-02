/**
 * Admin Dashboard View
 * Shows overview stats, recent activity, and quick action links.
 */

import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  CreditCard,
  Users,
  TrendingUp,
  ClipboardCheck,
  Receipt,
  FileOutput,
  ArrowRight,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
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

interface FinanceStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

export interface DashboardAdminProps {
  allWorkItems: WorkItem[];
  allUsers: User[];
  paymentStats: PaymentStats;
  financeStats: FinanceStats;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROW_CLASS =
  'flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3';

function getWorkItemLabel(item: WorkItem): string {
  return item.match_name || item.content_name || item.work_type;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardAdmin({
  allWorkItems,
  allUsers,
  paymentStats,
  financeStats,
}: DashboardAdminProps) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthWorkItems = allWorkItems.filter((item) =>
    item.work_date.startsWith(thisMonth)
  );
  const activeUsers = allUsers.filter((u) => u.is_active && u.role !== 'ADMIN');

  // Recent work items (last 5 by creation date)
  const recentWorkItems = [...allWorkItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const draftCount = allWorkItems.filter((i) => i.status === 'DRAFT').length;

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
      title: 'Net Bakiye',
      value: formatCurrency(financeStats.netBalance),
      description: `${formatCurrency(financeStats.totalIncome)} gelir / ${formatCurrency(financeStats.totalExpenses)} gider`,
      icon: TrendingUp,
      color: financeStats.netBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]',
    },
  ];

  const quickActions = [
    {
      label: 'Onay Bekleyenler',
      description: `${draftCount} taslak iş`,
      href: '/work-items?status=DRAFT',
      icon: ClipboardCheck,
    },
    {
      label: 'Ödeme Oluştur',
      description: 'Onaylı işlerden ödeme',
      href: '/work-items?status=APPROVED',
      icon: CreditCard,
    },
    {
      label: 'İşlem Ekle',
      description: 'Gelir veya gider kaydı',
      href: '/payments?tab=realized',
      icon: Receipt,
    },
    {
      label: 'Rapor Oluştur',
      description: 'Aylık performans raporu',
      href: '/reports',
      icon: FileOutput,
    },
  ];

  return (
    <PageShell title={tr.dashboard.title} description={tr.dashboard.subtitle}>
      {/* Stat Cards */}
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

      {/* Recent Activity + Quick Actions */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{tr.dashboard.recentActivity}</CardTitle>
            <Link
              href="/work-items"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              Tümünü Gör
            </Link>
          </CardHeader>
          <CardContent>
            {recentWorkItems.length === 0 ? (
              <div
                className={cn(
                  'flex h-32 items-center justify-center',
                  'rounded-[var(--radius-md)]',
                  'border border-dashed border-[var(--color-border)]',
                  'text-sm text-[var(--color-text-muted)]'
                )}
              >
                Henüz iş kaydı yok
              </div>
            ) : (
              <div className="space-y-2">
                {recentWorkItems.map((item) => (
                  <div key={item.id} className={ROW_CLASS}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {getWorkItemLabel(item)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {item.user?.full_name} &middot; {formatDate(item.work_date)}
                      </p>
                    </div>
                    <div className="ml-3 text-right">
                      {item.cost ? (
                        <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
                          {formatCurrency(item.cost)}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5',
                            'text-xs font-medium',
                            item.status === 'DRAFT'
                              ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                              : item.status === 'APPROVED'
                                ? 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
                                : 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                          )}
                        >
                          {item.status === 'DRAFT' ? 'Taslak' : item.status === 'APPROVED' ? 'Onaylı' : 'Ödendi'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{tr.dashboard.quickActions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(
                      ROW_CLASS,
                      'group transition-colors hover:bg-[var(--color-accent-muted)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {action.label}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
