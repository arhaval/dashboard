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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusFlow, WorkTypeDonut } from '@/components/charts/work-charts';
import { workItemService, userService, paymentService } from '@/services';
import { cn, formatDate, formatCurrency, getWorkTypeLabel } from '@/lib/utils';
import { WORK_TYPES, WORK_STATUSES } from '@/constants';
import { tr } from '@/lib/i18n';
import { Plus, FileText, DollarSign } from 'lucide-react';
import { StatusControl } from './status-control';
import { WorkItemFilters } from './filters';
import { CreatePaymentButton } from './create-payment-button';
import { CostEditor } from './cost-editor';
import { WorkItemDeleteButton } from './delete-button';
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
  paymentStatuses: Record<string, string>;
}

function WorkItemsTable({ items, currentUserId, isAdmin, paymentStatuses }: WorkItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.table.noData}</p>
        <Link href="/work-items/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {tr.actions.addWorkItem}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
                {tr.workItem.fields.date}
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
                {tr.workItem.fields.type}
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
                Başlık
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:table-cell sm:px-4">
                {tr.workItem.fields.user}
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
                {tr.workItem.fields.status}
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
                {tr.workItem.fields.cost}
              </th>
              {isAdmin && (
                <th className="px-3 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] sm:px-4">
                  {tr.table.actions}
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
                <td className="px-3 py-3 text-xs text-[var(--color-text-muted)] sm:px-4 sm:text-sm">
                  {formatDate(item.work_date)}
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5',
                      'text-xs font-medium',
                      getTypeBadgeStyles(item.work_type)
                    )}
                  >
                    {getWorkTypeLabel(item.work_type)}
                  </span>
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <span className="block max-w-[140px] truncate text-xs font-medium text-[var(--color-text-primary)] sm:max-w-none sm:text-sm">
                    {getWorkItemTitle(item)}
                  </span>
                  {item.work_type === 'STREAM' && item.duration_minutes && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {item.duration_minutes} min
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-3 text-sm text-[var(--color-text-secondary)] sm:table-cell sm:px-4">
                  {item.user?.full_name || '—'}
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <StatusControl
                    workItemId={item.id}
                    currentStatus={item.status}
                    isAdmin={isAdmin}
                    isOwnItem={item.user_id === currentUserId}
                  />
                </td>
                <td className="px-3 py-3 text-right sm:px-4">
                  <CostEditor
                    workItemId={item.id}
                    currentCost={item.cost}
                    canEdit={isAdmin && item.user_id !== currentUserId && item.status === 'DRAFT'}
                  />
                </td>
                {isAdmin && (
                  <td className="px-3 py-3 text-right sm:px-4">
                    <div className="flex items-center justify-end gap-2">
                      {item.status === 'APPROVED' && item.user_id !== currentUserId && item.cost && (
                        paymentStatuses[item.id] === 'PENDING' ? (
                          <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--color-warning-muted)] text-[var(--color-warning)]')}>
                            Bekliyor
                          </span>
                        ) : paymentStatuses[item.id] === 'PAID' ? (
                          <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--color-success-muted)] text-[var(--color-success)]')}>
                            Ödendi
                          </span>
                        ) : (
                          <CreatePaymentButton workItemId={item.id} userId={item.user_id} />
                        )
                      )}
                      {item.status !== 'PAID' && !paymentStatuses[item.id] && (
                        <WorkItemDeleteButton workItemId={item.id} />
                      )}
                    </div>
                  </td>
                )}
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

  if (params.status && (WORK_STATUSES as readonly string[]).includes(params.status)) {
    filters.status = params.status as WorkStatus;
  }

  if (params.type && (WORK_TYPES as readonly string[]).includes(params.type)) {
    filters.work_type = params.type as WorkType;
  }

  if (params.user_id && isAdmin) {
    filters.user_id = params.user_id;
  }

  // Fetch data (ALL items for analytics, filtered items for table)
  const [allItems, items, stats, users] = await Promise.all([
    workItemService.getAll(), // unfiltered — for analytics
    workItemService.getAll(filters),
    workItemService.getStats(),
    isAdmin ? userService.getAll() : Promise.resolve([]),
  ]);

  // Get payment statuses for approved items
  const approvedItemIds = isAdmin
    ? items.filter((i) => i.status === 'APPROVED' && i.cost).map((i) => i.id)
    : [];
  const paymentStatuses =
    approvedItemIds.length > 0
      ? await paymentService.getPaymentStatusesForWorkItems(approvedItemIds)
      : {};

  // Analytics derived from ALL items
  const streamCount = allItems.filter((i) => i.work_type === 'STREAM').length;
  const voiceCount = allItems.filter((i) => i.work_type === 'VOICE').length;
  const editCount = allItems.filter((i) => i.work_type === 'EDIT').length;
  const totalCost = allItems.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);

  // Top earners (by total cost) — admin only
  const earnerMap = new Map<string, { name: string; total: number; count: number }>();
  if (isAdmin) {
    for (const item of allItems) {
      if (!item.cost || !item.user?.full_name) continue;
      const existing = earnerMap.get(item.user_id) ?? {
        name: item.user.full_name,
        total: 0,
        count: 0,
      };
      existing.total += Number(item.cost);
      existing.count += 1;
      earnerMap.set(item.user_id, existing);
    }
  }
  const topEarners = Array.from(earnerMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <PageShell
      title={tr.pages.workItems.title}
      description={tr.pages.workItems.subtitle}
      actions={
        <Link href="/work-items/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {tr.actions.addWorkItem}
          </Button>
        </Link>
      }
    >
      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam İş Kaydı"
          value={stats.total.toString()}
          description="Tüm zamanlar"
          icon={FileText}
          color="orange"
        />
        <StatCard
          title="Taslak"
          value={stats.draft.toString()}
          description="Onay bekliyor"
          icon={FileText}
          color="yellow"
        />
        <StatCard
          title="Onaylı"
          value={stats.approved.toString()}
          description="Ödemeye hazır"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Toplam Tutar"
          value={formatCurrency(totalCost)}
          description="Tüm ödemeler"
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* ── Analytics Strip ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Status Flow */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
              Durum Dağılımı
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">
              DRAFT → APPROVED → PAID akışı
            </p>
          </CardHeader>
          <CardContent>
            <StatusFlow
              draft={stats.draft}
              approved={stats.approved}
              paid={stats.paid}
              total={stats.total}
            />
          </CardContent>
        </Card>

        {/* Work Type Donut */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
              İş Türü Dağılımı
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">
              Yayın / Ses / Kurgu oranları
            </p>
          </CardHeader>
          <CardContent>
            <WorkTypeDonut stream={streamCount} voice={voiceCount} edit={editCount} />
          </CardContent>
        </Card>

        {/* Top Earners — admin only */}
        {isAdmin && topEarners.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                En Yüksek Kazanan
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                Toplam maliyet bazlı
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topEarners.map((earner, idx) => (
                  <div key={earner.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: idx === 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-primary)]">
                          {earner.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {earner.count} kayıt
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(earner.total)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Filters + Table ── */}
      <div className="mt-6">
        <WorkItemFilters
          currentStatus={params.status}
          currentType={params.type}
          currentUserId={params.user_id}
          users={users}
          isAdmin={isAdmin}
        />
        <div className="mt-4">
          <WorkItemsTable
            items={items}
            currentUserId={currentUser.id}
            isAdmin={isAdmin}
            paymentStatuses={paymentStatuses}
          />
        </div>
      </div>
    </PageShell>
  );
}
