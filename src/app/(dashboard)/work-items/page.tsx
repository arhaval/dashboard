/**
 * Work Items Page
 * Lists all work items (Server Component)
 * Shows STREAM, VOICE, EDIT work entries
 * Supports server-side filtering via URL search params
 */

import { FileText as PageIcon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Pager } from '@/components/ui/pager';
import { paginate, parsePage } from '@/lib/paginate';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHead, WorkloadStrip, CapacityCard, BarsChart, shortTL } from '@/components/dashboard/widgets';
import { workItemService, userService, paymentService } from '@/services';
import { cn, formatDate, formatCurrency, getWorkTypeLabel } from '@/lib/utils';
import { WORK_TYPES, WORK_STATUSES } from '@/constants';
import { tr } from '@/lib/i18n';
import { Plus, FileText, DollarSign, CalendarDays, Wallet, CalendarClock } from 'lucide-react';
import { StatusControl } from './status-control';
import { WorkItemFilters } from './filters';
import { CreatePaymentButton } from './create-payment-button';
import { CostEditor } from './cost-editor';
import { WorkItemDeleteButton } from './delete-button';
import { MyWorkView } from './my-work-view';
import type { WorkItem, WorkType, WorkStatus } from '@/types';
import { currentMonthTR } from '@/lib/utils/dates';


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

  const adminActions = (item: (typeof items)[number]) => (
    <>
      {item.status === 'APPROVED' && item.user_id !== currentUserId && item.cost && (
        paymentStatuses[item.id] === 'PENDING' ? (
          <span className="inline-block rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-warning)]">Bekliyor</span>
        ) : paymentStatuses[item.id] === 'PAID' ? (
          <span className="inline-block rounded-full bg-[var(--color-success-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">Ödendi</span>
        ) : (
          <CreatePaymentButton workItemId={item.id} userId={item.user_id} />
        )
      )}
      {item.status !== 'PAID' && !paymentStatuses[item.id] && (
        <WorkItemDeleteButton workItemId={item.id} />
      )}
    </>
  );

  return (
    <>
      {/* Mobile: one card per item — status + cost reachable without scrolling */}
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {getWorkItemTitle(item)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {formatDate(item.work_date)}
                  {item.user?.full_name ? ` · ${item.user.full_name}` : ''}
                </p>
                {item.client && !item.client.is_internal && (
                  <span className="mt-1 inline-block rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                    {item.client.name}
                  </span>
                )}
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', getTypeBadgeStyles(item.work_type))}>
                {getWorkTypeLabel(item.work_type)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-2">
              <StatusControl
                workItemId={item.id}
                currentStatus={item.status}
                isAdmin={isAdmin}
                isOwnItem={item.user_id === currentUserId}
              />
              <div className="ml-auto">
                <CostEditor
                  workItemId={item.id}
                  currentCost={item.cost}
                  canEdit={isAdmin && item.user_id !== currentUserId && item.status === 'DRAFT'}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] pt-2">
                {adminActions(item)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] md:block">
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
                  <span className="flex items-center gap-2">
                    {item.work_type === 'STREAM' && item.duration_minutes && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {item.duration_minutes} min
                      </span>
                    )}
                    {item.client && !item.client.is_internal && (
                      <span className="inline-block rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                        {item.client.name}
                      </span>
                    )}
                  </span>
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
                      {adminActions(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}

interface PageProps {
  searchParams: Promise<{
    status?: string;
    type?: string;
    user_id?: string;
    sayfa?: string;
    ay?: string;
    musteri?: string;
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

  // Çalışanlar kendi sade görünümünü alır (ay/müşteri filtresi, hak ediş,
  // taslağını düzelt/sil). Analitik ve onay araçları admin içindir.
  if (!isAdmin) {
    const myItems = await workItemService.getAll({ user_id: currentUser.id });
    return (
      <MyWorkView
        items={myItems}
        params={{ ay: params.ay, musteri: params.musteri, sayfa: params.sayfa }}
        fullName={currentUser.full_name}
        isPublisher={currentUser.role === 'PUBLISHER'}
      />
    );
  }

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

  // Tablo sayfalanıyor: 173 kaydı birden basmak sayfayı ağırlaştırıyor ve
  // aradığın kayıt ekranda kayboluyordu. Analitik kutuları hâlâ TÜM kayıttan
  // hesaplanıyor (allItems), yalnızca tablo dilimleniyor.
  const paged = paginate(items, parsePage(params.sayfa));

  // Ödeme durumları yalnızca ekranda görünen satırlar için sorgulanıyor —
  // eskiden filtrelenen her onaylı iş için sorgu atılıyordu.
  const approvedItemIds = isAdmin
    ? paged.rows.filter((i) => i.status === 'APPROVED' && i.cost).map((i) => i.id)
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
  const unpaidTotal = allItems
    .filter((i) => i.status === 'APPROVED')
    .reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
  const thisMonth = currentMonthTR();
  const thisMonthCount = allItems.filter((i) => i.work_date.startsWith(thisMonth)).length;

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
    <PageShell icon={PageIcon}
      title={tr.pages.workItems.title}
      description={tr.pages.workItems.subtitle}
      actions={
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/work-items/planla">
              <Button variant="outline">
                <CalendarClock className="mr-2 h-4 w-4" />
                Planla
              </Button>
            </Link>
          )}
          <Link href="/work-items/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tr.actions.addWorkItem}
            </Button>
          </Link>
        </div>
      }
    >
      {/* ── Genel bakış ── */}
      <section>
        <SectionHead title="Genel bakış" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Toplam iş kaydı" value={stats.total.toString()} description="Tüm zamanlar" icon={FileText} color="orange" />
          <StatCard title="Bu ay" value={thisMonthCount.toString()} description="Bu ay girilen iş" icon={CalendarDays} color="purple" />
          <StatCard title="Ödenmemiş" value={formatCurrency(unpaidTotal)} description={`${stats.approved} onaylı iş`} icon={Wallet} color="yellow" />
          <StatCard title="Toplam tutar" value={formatCurrency(totalCost)} description="Tüm işler" icon={DollarSign} color="green" />
        </div>
      </section>

      {/* ── Durum halkaları ── */}
      <div className="mt-6">
        <WorkloadStrip
          title="Durum"
          openLabel={`${stats.draft + stats.approved} açık iş`}
          items={[
            { label: 'Taslak', count: stats.draft, color: 'var(--color-text-secondary)', sub: 'Onay bekliyor' },
            { label: 'Onaylı', count: stats.approved, color: 'var(--color-warning)', sub: 'Ödemeye hazır' },
            { label: 'Ödendi', count: stats.paid, color: 'var(--color-success)', sub: 'Tamamlandı' },
          ]}
        />
      </div>

      {/* ── İş türü + kazananlar ── */}
      <div className={`mt-6 grid gap-3 ${isAdmin && topEarners.length > 0 ? 'lg:grid-cols-2' : ''}`}>
        <CapacityCard
          title="İş türü dağılımı"
          subtitle="Yayın / Seslendirme / Kurgu"
          chip="Tüm zamanlar"
          total={streamCount + voiceCount + editCount}
          totalLabel="iş"
          format={String}
          segments={[
            { label: 'Yayın', amount: streamCount, color: 'var(--color-accent)' },
            { label: 'Seslendirme', amount: voiceCount, color: 'var(--color-warning)' },
            { label: 'Kurgu', amount: editCount, color: 'var(--color-success)' },
          ]}
        />
        {isAdmin && topEarners.length > 0 && (
          <BarsChart
            title="En çok kazananlar"
            subtitle="Toplam iş tutarı · ortalamaya göre"
            chip="Tüm zamanlar"
            data={topEarners.map((e) => ({ label: e.name.split(' ')[0], value: e.total }))}
            highlightIndex={0}
            callout="Lider"
            format={shortTL}
          />
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
            items={paged.rows}
            currentUserId={currentUser.id}
            isAdmin={isAdmin}
            paymentStatuses={paymentStatuses}
          />
          <Pager paged={paged} basePath="/work-items" params={params} label="iş" />
        </div>
      </div>
    </PageShell>
  );
}
