/**
 * Admin Dashboard View — "Arhaval Dashboard"
 * Balanced command center: Summary (finance) → Action (approve/pay) → Performance.
 * Same data as before; layout and hierarchy redesigned. Theme is locked.
 */

import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { TodayPanel } from './today-panel';
import type { ContentQueueItem } from './icerik-plani/content-queue.constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ContentTrendChart, TeamContentChart } from '@/components/charts/content-charts';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Mic,
  Scissors,
  Video,
  ArrowRight,
  Clock,
  CheckCircle2,
  DollarSign,
  Users,
  Target,
  CalendarDays,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { WorkItem, User, WeeklyGoalProgress } from '@/types';
import type { DaySchedule } from '@/services/weekly-schedule.utils';
import { ACTIVITY_LABELS, DAY_SHORT } from '@/services/weekly-schedule.utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface MonthlyFinanceStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

interface PaymentStats {
  total: number;
  pending: number;
  paid: number;
  cancelled: number;
  totalAmount: number;
}

interface ContentStats {
  thisMonth: { voice: number; edit: number; total: number };
  lastMonth: { voice: number; edit: number; total: number };
  change: number;
}

interface ContentTrendPoint {
  month: string;
  label: string;
  voice: number;
  edit: number;
  total: number;
}

interface TeamContentEntry {
  userId: string;
  name: string;
  voice: number;
  edit: number;
  total: number;
}

export interface DashboardAdminProps {
  contentQueue: ContentQueueItem[];
  allWorkItems: WorkItem[];
  allUsers: User[];
  paymentStats: PaymentStats;
  monthlyFinanceStats: MonthlyFinanceStats;
  unpaidTotal: number;
  contentStats: ContentStats;
  contentTrend: ContentTrendPoint[];
  teamContentStats: TeamContentEntry[];
  weeklyGoalProgress: WeeklyGoalProgress[];
  weeklySchedule: DaySchedule[];
  currentMonth: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getWorkItemTitle(item: WorkItem): string {
  return item.match_name || item.content_name || item.work_type;
}

/** Consistent section eyebrow with an optional "see all" link. */
function SectionLabel({
  children,
  href,
  linkText = 'Tümü',
}: {
  children: React.ReactNode;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        {children}
      </p>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
        >
          {linkText} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/** An actionable work-item row shared by both action lists. */
function ActionRow({
  item,
  idx,
  right,
}: {
  item: WorkItem;
  idx: number;
  right: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-3',
        'border-b border-[var(--color-border)] last:border-0',
        idx % 2 === 0 ? 'bg-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-primary)]'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {getWorkItemTitle(item)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {item.user?.full_name} · {formatDate(item.work_date)}
        </p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">{right}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function DashboardAdmin({
  contentQueue,
  allWorkItems,
  allUsers,
  paymentStats,
  monthlyFinanceStats,
  unpaidTotal,
  contentStats,
  contentTrend,
  teamContentStats,
  weeklyGoalProgress,
  weeklySchedule,
  currentMonth,
}: DashboardAdminProps) {
  const activeMembers = allUsers.filter((u) => u.is_active && u.role !== 'ADMIN');

  const pendingApproval = allWorkItems
    .filter((i) => i.status === 'DRAFT')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const pendingPayment = allWorkItems
    .filter((i) => i.status === 'APPROVED' && i.cost)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const [, m] = currentMonth.split('-').map(Number);
  const monthLabel = TR_MONTHS[m - 1];

  const hasUnpaid = unpaidTotal > 0;
  const profitable = monthlyFinanceStats.netBalance >= 0;

  return (
    <PageShell title="Arhaval Dashboard" description={`${monthLabel} · operasyon komuta merkezi`}>

      {/* ═══ BUGÜN — pipeline durumu ═══ */}
      <TodayPanel workItems={allWorkItems} content={contentQueue} />

      {/* ═══ ÖZET — Finansal durum ═══ */}
      <SectionLabel href="/finance" linkText="Finans">Finansal Durum</SectionLabel>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Focal: Ödenmemiş — the one number that drives action */}
        <Card
          className={cn(
            'lg:col-span-1',
            hasUnpaid && 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
          )}
        >
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Ödenmemiş Tutar
              </p>
              <AlertCircle
                className={cn('h-5 w-5', hasUnpaid ? 'text-[var(--color-accent)]' : 'text-[var(--color-success)]')}
              />
            </div>
            <p
              className={cn(
                'mt-3 text-3xl font-bold tabular-nums',
                hasUnpaid ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
              )}
            >
              {formatCurrency(unpaidTotal)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {hasUnpaid
                ? `${paymentStats.pending} onaylı iş ödeme bekliyor`
                : 'Bekleyen ödeme yok'}
            </p>
            <div className="mt-auto pt-4">
              <Link
                href="/payments"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                Ödemeleri gör <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Finance trio */}
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          <StatCard
            title={`${monthLabel} Geliri`}
            value={formatCurrency(monthlyFinanceStats.totalIncome)}
            description="Bu ayki toplam gelir"
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title={`${monthLabel} Gideri`}
            value={formatCurrency(monthlyFinanceStats.totalExpenses)}
            description="Bu ayki toplam gider"
            icon={TrendingDown}
            color="red"
          />
          <StatCard
            title="Net Bakiye"
            value={formatCurrency(monthlyFinanceStats.netBalance)}
            description={profitable ? 'Kârlı ay' : 'Zararlı ay'}
            icon={DollarSign}
            color={profitable ? 'teal' : 'red'}
            change={
              monthlyFinanceStats.netBalance !== 0
                ? { value: profitable ? 'Pozitif' : 'Negatif', positive: profitable }
                : undefined
            }
          />
        </div>
      </div>

      {/* ═══ AKSİYON — bugün neye bakmalıyım ═══ */}
      <SectionLabel>Aksiyon Gerektiren</SectionLabel>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ödeme Bekleyenler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Ödeme Bekleyenler
              </CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Onaylı — ödeme oluşturulmayı bekliyor
              </p>
            </div>
            <Link
              href="/work-items?status=APPROVED"
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
            >
              Tümü <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {pendingPayment.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-[var(--color-text-muted)]">
                <CheckCircle2 className="mr-2 h-4 w-4 text-[var(--color-success)]" />
                Bekleyen ödeme yok
              </div>
            ) : (
              <div>
                {pendingPayment.map((item, idx) => (
                  <ActionRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    right={
                      <span className="font-mono text-sm font-semibold text-[var(--color-success)]">
                        {formatCurrency(item.cost ?? 0)}
                      </span>
                    }
                  />
                ))}
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)]">Toplam bekleyen</span>
                    <span className="font-mono text-sm font-bold text-[var(--color-accent)]">
                      {formatCurrency(unpaidTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onay Bekleyenler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Onay Bekleyenler
              </CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Taslak — inceleme ve onay bekliyor
              </p>
            </div>
            <Link
              href="/work-items?status=DRAFT"
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
            >
              Tümü <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {pendingApproval.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-[var(--color-text-muted)]">
                <CheckCircle2 className="mr-2 h-4 w-4 text-[var(--color-success)]" />
                Bekleyen onay yok
              </div>
            ) : (
              <div>
                {pendingApproval.map((item, idx) => (
                  <ActionRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    right={
                      <>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            item.work_type === 'VOICE'
                              ? 'bg-[var(--color-info-muted)] text-[var(--color-info)]'
                              : item.work_type === 'EDIT'
                                ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                                : 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                          )}
                        >
                          {item.work_type === 'VOICE' ? 'Ses' : item.work_type === 'EDIT' ? 'Kurgu' : 'Yayın'}
                        </span>
                        <Clock className="h-3.5 w-3.5 text-[var(--color-warning)]" />
                      </>
                    }
                  />
                ))}
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-5 py-3">
                  <Link
                    href="/work-items?status=DRAFT"
                    className="flex items-center justify-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Hepsini İncele <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ PERFORMANS — İçerik üretimi ═══ */}
      <SectionLabel>İçerik Üretimi — {monthLabel}</SectionLabel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam İçerik"
          value={contentStats.thisMonth.total.toString()}
          description={`Geçen ay: ${contentStats.lastMonth.total}`}
          icon={Video}
          color="orange"
          change={
            contentStats.lastMonth.total > 0 || contentStats.thisMonth.total > 0
              ? { value: `${Math.abs(contentStats.change)}%`, positive: contentStats.change >= 0 }
              : undefined
          }
        />
        <StatCard
          title="Seslendirme"
          value={contentStats.thisMonth.voice.toString()}
          description={`Geçen ay: ${contentStats.lastMonth.voice}`}
          icon={Mic}
          color="blue"
        />
        <StatCard
          title="Kurgu"
          value={contentStats.thisMonth.edit.toString()}
          description={`Geçen ay: ${contentStats.lastMonth.edit}`}
          icon={Scissors}
          color="purple"
        />
        <StatCard
          title="Aktif Üye"
          value={activeMembers.length.toString()}
          description="İçerik üretiyor"
          icon={Users}
          color="teal"
        />
      </div>

      {/* ═══ PERFORMANS — Grafikler ═══ */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
              İçerik Üretim Trendi
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">
              Son 6 ay — Seslendirme + Kurgu toplamı
            </p>
          </CardHeader>
          <CardContent>
            <ContentTrendChart data={contentTrend} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
              Ekip Performansı
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">
              {monthLabel} — kişi bazlı içerik
            </p>
          </CardHeader>
          <CardContent>
            {teamContentStats.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-[var(--color-text-muted)]">
                Bu ay henüz içerik yok
              </div>
            ) : (
              <TeamContentChart data={teamContentStats} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ PERFORMANS — Bu hafta ═══ */}
      <SectionLabel>Bu Hafta</SectionLabel>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Haftalık Hedefler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[var(--color-accent)]" />
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                İçerik Hedefleri
              </CardTitle>
            </div>
            <Link
              href="/content/goals"
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
            >
              Düzenle <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {weeklyGoalProgress.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Henüz hedef tanımlanmamış.</p>
            ) : (
              <div className="space-y-3">
                {(['YOUTUBE', 'INSTAGRAM', 'X'] as const).map((platform) => {
                  const items = weeklyGoalProgress.filter(
                    (g) => g.platform === platform && g.weekly_target > 0
                  );
                  if (items.length === 0) return null;
                  const platformLabel =
                    platform === 'YOUTUBE' ? 'YouTube' :
                    platform === 'INSTAGRAM' ? 'Instagram' : 'Twitter/X';
                  return (
                    <div key={platform}>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                        {platformLabel}
                      </p>
                      <div className="space-y-2">
                        {items.map((g) => {
                          const subtypeLabel =
                            g.sub_type === 'VIDEO' ? 'Video' :
                            g.sub_type === 'SHORTS' ? 'Shorts' :
                            g.sub_type === 'REELS' ? 'Reels' :
                            g.sub_type === 'POST' ? 'Gönderi' : g.sub_type;
                          return (
                            <div key={g.sub_type}>
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  {subtypeLabel}
                                </span>
                                <span className={cn(
                                  'text-xs font-bold tabular-nums',
                                  g.on_track ? 'text-[var(--color-success)]' :
                                  g.pct >= 50 ? 'text-[var(--color-warning)]' :
                                  'text-[var(--color-text-primary)]'
                                )}>
                                  {g.done_this_week}/{g.weekly_target}
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    g.on_track ? 'bg-[var(--color-success)]' :
                                    g.pct >= 50 ? 'bg-[var(--color-warning)]' :
                                    'bg-[var(--color-accent)]'
                                  )}
                                  style={{ width: `${g.pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Haftalık Program */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Haftalık Program
              </CardTitle>
            </div>
            <Link
              href="/content/schedule"
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
            >
              Düzenle <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {weeklySchedule.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Program henüz oluşturulmamış.</p>
            ) : (
              <div className="space-y-2">
                {weeklySchedule.map((day) => {
                  const today = new Date().getDay();
                  const isoDay = today === 0 ? 7 : today;
                  const isToday = day.day_of_week === isoDay;
                  return (
                    <div
                      key={day.day_of_week}
                      className={cn(
                        'flex items-start gap-3 rounded-[var(--radius-sm)] px-2 py-1.5',
                        isToday && 'bg-[var(--color-accent-muted)]'
                      )}
                    >
                      <span className={cn(
                        'w-8 shrink-0 text-xs font-semibold',
                        isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                      )}>
                        {DAY_SHORT[day.day_of_week - 1]}
                      </span>
                      <div className="flex min-w-0 flex-wrap gap-1">
                        {day.activities.length === 0 ? (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        ) : (
                          day.activities.map((act) => (
                            <span
                              key={act}
                              className="rounded-full border px-2 py-0.5 text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
                            >
                              {ACTIVITY_LABELS[act]}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
