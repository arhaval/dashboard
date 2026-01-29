/**
 * Work Items Page
 * Lists all work items (Server Component)
 * Shows STREAM, VOICE, EDIT work entries
 * Supports server-side filtering via URL search params
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { workItemService, userService } from '@/services';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { StatusControl } from './status-control';
import { WorkItemFilters } from './filters';
import { CreatePaymentButton } from './create-payment-button';
import { CostEditor } from './cost-editor';
import type { WorkItem, WorkType, WorkStatus } from '@/types';

function getTypeBadgeStyles(type: string) {
  switch (type) {
    case 'STREAM':
      return 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]';
    case 'VOICE':
      return 'bg-[var(--color-info-muted)] text-[var(--color-info)]';
    case 'EDIT':
      return 'bg-[var(--color-success-muted)] text-[var(--color-success)]';
    default:
      return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number | null) {
  if (amount === null) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

function getWorkItemTitle(item: WorkItem) {
  if (item.work_type === 'STREAM' && item.match_name) {
    return item.match_name;
  }
  if ((item.work_type === 'VOICE' || item.work_type === 'EDIT') && item.content_name) {
    return item.content_name;
  }
  return `${item.work_type} - ${formatDate(item.work_date)}`;
}

interface WorkItemsTableProps {
  items: WorkItem[];
  currentUserId: string;
  isAdmin: boolean;
}

function WorkItemsTable({ items, currentUserId, isAdmin }: WorkItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>No work items found</p>
        <Link href="/work-items/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Work Item
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
              Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Title
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              User
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Status
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              Cost
            </th>
            {isAdmin && (
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className={cn(
                'border-b border-[var(--color-border)] last:border-b-0',
                index % 2 === 0
                  ? 'bg-[var(--color-table-row-even)]'
                  : 'bg-[var(--color-table-row-odd)]'
              )}
            >
              <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                {formatDate(item.work_date)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5',
                    'text-xs font-medium',
                    getTypeBadgeStyles(item.work_type)
                  )}
                >
                  {item.work_type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {getWorkItemTitle(item)}
                </span>
                {item.work_type === 'STREAM' && item.duration_minutes && (
                  <span className="ml-2 text-sm text-[var(--color-text-muted)]">
                    ({item.duration_minutes} min)
                  </span>
                )}
                {(item.work_type === 'VOICE' || item.work_type === 'EDIT') &&
                  item.content_length && (
                    <span className="ml-2 text-sm text-[var(--color-text-muted)]">
                      ({item.content_length})
                    </span>
                  )}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {item.user?.full_name || '—'}
              </td>
              <td className="px-4 py-3">
                <StatusControl
                  workItemId={item.id}
                  currentStatus={item.status}
                  isAdmin={isAdmin}
                  isOwnItem={item.user_id === currentUserId}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <CostEditor
                  workItemId={item.id}
                  currentCost={item.cost}
                  canEdit={isAdmin && item.user_id !== currentUserId && item.status === 'DRAFT'}
                />
              </td>
              {isAdmin && (
                <td className="px-4 py-3 text-right">
                  {item.status === 'APPROVED' && item.user_id !== currentUserId && item.cost && (
                    <CreatePaymentButton workItemId={item.id} userId={item.user_id} />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{
    status?: string;
    type?: string;
    user_id?: string;
  }>;
}

export default async function WorkItemsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Get current user
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  // Build filters from search params
  const filters: {
    status?: WorkStatus;
    work_type?: WorkType;
    user_id?: string;
  } = {};

  if (params.status && ['DRAFT', 'APPROVED', 'PAID'].includes(params.status)) {
    filters.status = params.status as WorkStatus;
  }

  if (params.type && ['STREAM', 'VOICE', 'EDIT'].includes(params.type)) {
    filters.work_type = params.type as WorkType;
  }

  if (params.user_id && isAdmin) {
    filters.user_id = params.user_id;
  }

  // Fetch data
  const [items, stats, users] = await Promise.all([
    workItemService.getAll(filters),
    workItemService.getStats(),
    isAdmin ? userService.getAll() : Promise.resolve([]),
  ]);

  return (
    <PageShell
      title="Work Items"
      description="Track work entries"
      actions={
        <Link href="/work-items/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Work Item
          </Button>
        </Link>
      }
    >
      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Total</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Draft</p>
          <p className="text-2xl font-semibold text-[var(--color-warning)]">{stats.draft}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Approved</p>
          <p className="text-2xl font-semibold text-[var(--color-info)]">{stats.approved}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Paid</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{stats.paid}</p>
        </div>
      </div>

      {/* Filters */}
      <WorkItemFilters
        currentStatus={params.status}
        currentType={params.type}
        currentUserId={params.user_id}
        users={users}
        isAdmin={isAdmin}
      />

      {/* Work Items Table */}
      <WorkItemsTable items={items} currentUserId={currentUser.id} isAdmin={isAdmin} />
    </PageShell>
  );
}
