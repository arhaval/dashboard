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

// Placeholder stats - will be replaced with real data
const stats = [
  {
    title: 'Total Work Items',
    value: '—',
    description: 'This month',
    icon: FileText,
    trend: null,
  },
  {
    title: 'Pending Payments',
    value: '—',
    description: 'Awaiting processing',
    icon: CreditCard,
    trend: null,
  },
  {
    title: 'Team Members',
    value: '—',
    description: 'Active users',
    icon: Users,
    trend: null,
  },
  {
    title: 'Revenue',
    value: '—',
    description: 'This month',
    icon: TrendingUp,
    trend: null,
  },
];

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      description="Overview of your operations"
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
            <CardTitle>Recent Activity</CardTitle>
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
              Activity feed will appear here
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
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
              Quick actions will appear here
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
