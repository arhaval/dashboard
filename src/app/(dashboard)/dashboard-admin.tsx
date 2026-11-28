/**
 * Admin Dashboard — Tessera dili.
 * Genel bakış · içerik hattı (halkalar) · aylık bütçe + ekip performansı ·
 * ekip aktivitesi · sağda profil paneli. Yayıncı dashboard'u ile aynı parçalar.
 */

import {
  LayoutGrid, Wallet,
  Clapperboard, Scale,
} from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { formatCurrency, getWorkTypeLabel } from '@/lib/utils';
import type { WorkItem, User, WeeklyGoalProgress, ContentPlan } from '@/types';
import type { DaySchedule } from '@/services/weekly-schedule.utils';
import { deriveStage, STAGE_LABELS_MAP, type ContentQueueItem, type ContentStage } from './icerik-plani/content-queue.constants';
import { OverviewCard, WorkloadStrip, CapacityCard, BarsChart, SectionHead, shortTL } from '@/components/dashboard/widgets';
import { ActivityFeed, type ActivityEvent } from './activity-feed';
import { ProfilePanel } from './profile-panel';
import { TR_MONTHS, todayStr, relPast, relFuture, daysLeftInMonth, diffText, initialsOf } from '@/components/dashboard/utils';

interface MonthlyFinanceStats { totalIncome: number; totalExpenses: number; netBalance: number; transactionCount: number }
interface PaymentStats { total: number; pending: number; paid: number; cancelled: number; totalAmount: number }
interface ContentStats {
  thisMonth: { voice: number; edit: number; total: number };
  lastMonth: { voice: number; edit: number; total: number };
  change: number;
}
interface ContentTrendPoint { month: string; label: string; voice: number; edit: number; total: number }
interface TeamContentEntry { userId: string; name: string; voice: number; edit: number; total: number }

export interface DashboardAdminProps {
  viewer: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url' | 'created_at'>;
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
  /** Açık planlı yayınlar (yaklaşan + tarihi geçip girilmeyen). */
  streamPlans: ContentPlan[];
  currentMonth: string;
}

const STATUS = {
  DRAFT: { label: 'Onay bekliyor', color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)' },
  APPROVED: { label: 'Ödeme bekliyor', color: 'var(--color-warning)', bg: 'var(--color-warning-muted)' },
  PAID: { label: 'Ödendi', color: 'var(--color-success)', bg: 'var(--color-success-muted)' },
} as const;

const VERB: Record<string, string> = { STREAM: 'yayınını ekledi', VOICE: 'seslendirmesini ekledi', EDIT: 'kurgusunu ekledi' };

const STAGES: { stage: ContentStage; color: string }[] = [
  { stage: 'METIN', color: 'var(--color-text-secondary)' },
  { stage: 'SES', color: 'var(--color-warning)' },
  { stage: 'EDITOR', color: 'var(--color-accent)' },
  { stage: 'HAZIR', color: 'var(--color-success)' },
];

/** Ham veriden admin ekranının ihtiyaç duyduğu her şeyi tek yerde hesaplar. */
function buildAdminView(p: DashboardAdminProps) {
  const today = todayStr();
  const [, cm] = p.currentMonth.split('-').map(Number);
  const users = new Map(p.allUsers.map((u) => [u.id, u]));
  const nameOf = (id: string | null) => (id ? users.get(id)?.full_name ?? null : null);

  const members = p.allUsers.filter((u) => u.is_active && u.role !== 'ADMIN');
  const draft = p.allWorkItems.filter((i) => i.status === 'DRAFT');
  const approved = p.allWorkItems.filter((i) => i.status === 'APPROVED' && i.cost);

  const active = p.contentQueue.filter((c) => c.status !== 'YAYINLANDI');
  const pipeline = STAGES.map(({ stage, color }) => {
    const items = active.filter((c) => deriveStage(c) === stage);
    const oldest = items.map((c) => c.created_at).sort()[0];
    const avatars = [...new Set(items
      .map((c) => nameOf(c.assigned_to ?? c.voiced_by ?? c.edited_by))
      .filter((n): n is string => Boolean(n))
      .map(initialsOf))];
    return { label: STAGE_LABELS_MAP[stage], count: items.length, color, sub: oldest ? `En eski ${relPast(oldest, today)}` : '—', avatars };
  });

  const events: ActivityEvent[] = [...p.allWorkItems]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 40)
    .map((i) => {
      const who = i.user?.full_name ?? 'Bilinmiyor';
      return {
        id: i.id, kind: i.status, date: i.created_at,
        actor: who.split(' ')[0], actorInitials: initialsOf(who), actorAvatar: i.user?.avatar_url ?? null,
        subject: i.match_name || i.content_name || getWorkTypeLabel(i.work_type),
        verb: VERB[i.work_type] ?? 'işini ekledi',
        when: relPast(i.created_at, today),
        meta: `${getWorkTypeLabel(i.work_type)}${i.cost ? ` · ${formatCurrency(Number(i.cost))}` : ''}`,
        status: { ...STATUS[i.status] }, href: '/work-items',
      };
    });

  // Yaklaşanlar: planlı yayınlar + içerik planı, tarihe göre tek liste.
  const unpriced = draft.filter((i) => i.cost == null);
  const overduePlans = p.streamPlans.filter((s) => s.planned_date < today);
  const upcoming = [
    ...p.streamPlans
      .filter((s) => s.planned_date >= today)
      .map((s) => ({
        id: s.id, date: s.planned_date, href: '/work-items/planla',
        title: `${s.title}${s.assignee?.full_name ? ` · ${s.assignee.full_name.split(' ')[0]}` : ''}`,
      })),
    ...p.contentQueue
      .filter((c) => c.status !== 'YAYINLANDI' && c.planned_date && c.planned_date >= today)
      .map((c) => ({ id: c.id, date: c.planned_date!, title: c.title, href: '/icerik-plani' })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)
    .map(({ date, ...rest }) => ({ ...rest, when: relFuture(date, today) }));

  const goals = p.weeklyGoalProgress;
  const bestMonth = Math.max(...p.contentTrend.map((t) => t.total), 1);
  const progress = goals.length
    ? { label: 'Haftalık içerik hedefi', pct: goals.reduce((s, g) => s + g.pct, 0) / goals.length }
    : { label: `${TR_MONTHS[cm - 1]} üretimi`, pct: (p.contentStats.thisMonth.total / bestMonth) * 100 };

  const { totalIncome, totalExpenses, netBalance } = p.monthlyFinanceStats;
  return {
    today, monthName: TR_MONTHS[cm - 1], members, draft, approved, pipeline, active, events, upcoming, progress,
    unpriced, overduePlans,
    income: totalIncome, expenses: totalExpenses, net: netBalance,
    remaining: Math.max(totalIncome - totalExpenses - p.unpaidTotal, 0),
    team: p.teamContentStats.slice(0, 6).map((t) => ({ label: t.name.split(' ')[0], value: t.total })),
  };
}

export function DashboardAdmin(props: DashboardAdminProps) {
  const v = buildAdminView(props);
  const content = diffText(props.contentStats.thisMonth.total - props.contentStats.lastMonth.total);
  const viewerInitials = initialsOf(props.viewer.full_name);

  return (
    <PageShell
      title="Genel bakış"
      icon={LayoutGrid}
      className="p-0 sm:p-0"
    >
      <div className="grid xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6 p-4 sm:p-6">
          <section>
            <SectionHead title="Bu ay" chip={v.monthName} />
            <div className="grid gap-3 md:grid-cols-3">
              <OverviewCard label="Üretilen içerik" hint="Bu ay üretilen seslendirme + kurgu sayısı"
                value={String(props.contentStats.thisMonth.total)} trend={content.trend} trendText={content.text}
                icon={Clapperboard} iconColor="var(--color-accent)" />
              <OverviewCard label="Net bakiye" hint="Bu ayın geliri eksi gideri" value={formatCurrency(v.net)}
                trend={v.net > 0 ? 'up' : v.net < 0 ? 'down' : 'neutral'}
                trendText={`Gelir ${shortTL(v.income)} · Gider ${shortTL(v.expenses)}`}
                icon={Scale} iconColor="var(--color-error)" />
              <OverviewCard label="Ödenmemiş" hint="Onaylanmış ama henüz ödenmemiş işlerin toplamı"
                value={formatCurrency(props.unpaidTotal)} trend={v.approved.length > 0 ? 'up' : 'neutral'}
                trendText={v.approved.length > 0 ? `${v.approved.length} iş ödeme bekliyor` : 'Bekleyen yok'}
                icon={Wallet} iconColor="var(--color-purple)" />
            </div>
          </section>

          <WorkloadStrip title="İçerik hattı" openLabel={`${v.active.length} aktif içerik`} items={v.pipeline} />

          <div className="grid gap-3 lg:grid-cols-2">
            <CapacityCard
              title="Aylık bütçe"
              subtitle={`${v.monthName} · ${daysLeftInMonth(props.currentMonth, v.today)} gün kaldı`}
              chip="Bu ay"
              total={v.income}
              totalLabel="gelir"
              segments={[
                { label: 'Harcanan', amount: v.expenses, color: 'var(--color-accent)' },
                { label: 'Ödenecek', amount: props.unpaidTotal, color: 'var(--color-warning)' },
                { label: 'Kalan', amount: v.remaining, color: 'var(--color-text-secondary)', hatched: true },
              ]}
            />
            <BarsChart
              title="Ekip performansı"
              subtitle="Bu ay kişi başı içerik · ortalamaya göre"
              chip="Bu ay"
              data={v.team}
              highlightIndex={0}
              callout="Lider"
              emptyText="Bu ay henüz içerik yok"
            />
          </div>

          <ActivityFeed
            title="Ekip aktivitesi"
            events={v.events}
            viewAllHref="/work-items"
            filters={[{ key: 'all', label: 'Tümü' }, { key: 'DRAFT', label: 'Onay bekleyen' }, { key: 'APPROVED', label: 'Ödenecek' }]}
          />
        </div>

        <ProfilePanel
          userId={props.viewer.id}
          fullName={props.viewer.full_name}
          handle={props.viewer.email.split('@')[0]}
          avatarUrl={props.viewer.avatar_url}
          initials={viewerInitials}
          tiles={[
            { label: 'Katıldı', value: new Date(props.viewer.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) },
            { label: 'Aktif üye', value: `${v.members.length} kişi` },
          ]}
          progress={v.progress}
          upcoming={v.upcoming}
          summary={{
            title: 'Ayın özeti',
            text:
              `Bu ay ${props.contentStats.thisMonth.total} içerik üretildi; ${formatCurrency(props.unpaidTotal)} ödeme ve ${v.draft.length} iş onay bekliyor.` +
              (v.unpriced.length ? ` ${v.unpriced.length} işin ücreti tanımlı değil.` : '') +
              (v.overduePlans.length ? ` ${v.overduePlans.length} planlı yayın henüz girilmedi.` : ''),
            primary: { href: '/payments', label: 'Ödemeler' },
          }}
        />
      </div>
    </PageShell>
  );
}
