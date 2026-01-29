/**
 * Dashboard Home Page
 * Main landing page after login
 * Shows overview stats and quick actions
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
import { tr } from '@/lib/i18n';

// Placeholder stats - will be replaced with real data
const stats = [
  {
    title: tr.dashboard.totalWorkItems,
    value: '—',
    description: tr.dashboard.thisMonth,
    icon: FileText,
    trend: null,
  },
  {
    title: tr.dashboard.pendingPayments,
    value: '—',
    description: tr.dashboard.awaitingProcessing,
    icon: CreditCard,
    trend: null,
  },
  {
    title: tr.dashboard.teamMembers,
    value: '—',
    description: tr.dashboard.activeUsers,
    icon: Users,
    trend: null,
  },
  {
    title: tr.dashboard.revenue,
    value: '—',
    description: tr.dashboard.thisMonth,
    icon: TrendingUp,
    trend: null,
  },
];

export default function DashboardPage() {
  return (
    <PageShell
      title={tr.dashboard.title}
      description={tr.dashboard.subtitle}
    >
      {/* Stats Grid */}
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
                <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
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

      {/* Placeholder for more dashboard content */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
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

        {/* Quick Actions */}
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
