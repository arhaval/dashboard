/**
 * Kişisel Dashboard — admin dışı tüm roller (Tessera "Your work" uyarlaması).
 * variant 'stream' (yayıncı): ölçü harita sayısı · variant 'work': ölçü iş sayısı.
 * Herkes yalnızca KENDİ verisini görür.
 */

import { Radio, Wallet, User as UserIcon, Map as MapIcon, Briefcase, Banknote } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { formatCurrency, getWorkTypeLabel } from '@/lib/utils';
import type { WorkItem, Payment, Transaction, ContentPlan } from '@/types';
import { PeriodStatCard, WorkloadStrip, CapacityCard, BarsChart, SectionHead } from '@/components/dashboard/widgets';
import { ActivityFeed, type ActivityEvent } from './activity-feed';
import { ProfilePanel } from './profile-panel';
import { QuickEntry } from './quick-entry';
import {
  TR_MONTHS, todayStr, shortDate, relPast, prevMonthOf, daysLeftInMonth, diffText, initialsOf,
} from '@/components/dashboard/utils';
import { MEMBER_STATUS, isExternalWork, splitByClient } from '@/lib/work-summary';

export interface DashboardPersonalProps {
  variant: 'stream' | 'work';
  roleLabel: string;
  userWorkItems: WorkItem[];
  userPayments: Payment[];
  userTransactions: Transaction[];
  myPlans: ContentPlan[];
  currentMonth: string;
  fullName: string;
  avatarUrl: string | null;
  joinedAt: string;
  userId: string;
  email: string;
  allowedPages: string[];
}

const STATUS = MEMBER_STATUS;

const VERB: Record<string, string> = { STREAM: 'yayınını ekledin', VOICE: 'seslendirmesini ekledin', EDIT: 'kurgusunu ekledin' };

const isExternal = isExternalWork;
const byClient = splitByClient;

const latest = (items: WorkItem[]) => items.map((i) => i.work_date).sort().at(-1);
const lastLabel = (items: WorkItem[]) => (latest(items) ? `Son ${shortDate(latest(items)!)}` : '—');

/** Ham veriden ekranın ihtiyaç duyduğu her şeyi tek yerde hesaplar. */
function buildView(p: DashboardPersonalProps) {
  const today = todayStr();
  const [cy, cm] = p.currentMonth.split('-').map(Number);
  const isStream = p.variant === 'stream';

  // Ölçü: yayıncıda yayınların harita toplamı, diğerlerinde iş adedi.
  const base = isStream ? p.userWorkItems.filter((i) => i.work_type === 'STREAM') : p.userWorkItems;
  const measure = (arr: WorkItem[]) => (isStream ? arr.reduce((s, i) => s + (i.map_count ?? 0), 0) : arr.length);
  const inMonth = (m: string) => base.filter((i) => i.work_date.startsWith(m));
  const cost = (arr: WorkItem[]) => arr.reduce((s, i) => s + Number(i.cost ?? 0), 0);

  const draft = p.userWorkItems.filter((i) => i.status === 'DRAFT');
  const approved = p.userWorkItems.filter((i) => i.status === 'APPROVED');
  const paid = p.userWorkItems.filter((i) => i.status === 'PAID');

  const open = p.myPlans
    // Geçmiş ama girilmemiş planlar da açık sayılır (yayın yapıldı, girilmedi)
    .filter((x) => x.status !== 'DONE' && x.status !== 'CANCELLED')
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date));

  const trend = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(cy, cm - 1 - (5 - k), 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { label: TR_MONTHS[d.getMonth()].slice(0, 3), value: measure(inMonth(mk)) };
  });

  const initials = initialsOf(p.fullName);
  const events: ActivityEvent[] = [
    ...p.userWorkItems.map((s) => ({
      id: `w-${s.id}`, kind: 'work', date: s.work_date,
      actor: 'Sen', actorInitials: initials, actorAvatar: p.avatarUrl,
      subject: s.match_name || s.content_name || getWorkTypeLabel(s.work_type),
      verb: VERB[s.work_type] ?? 'işini ekledin',
      when: relPast(s.work_date, today),
      meta: [
        isExternal(s) ? s.client!.name : null,
        s.map_count != null ? `${s.map_count} harita` : getWorkTypeLabel(s.work_type),
      ].filter(Boolean).join(' · '),
      status: { ...STATUS[s.status] }, href: '/work-items',
    })),
    ...p.userPayments.filter((x) => x.status === 'PAID').map((x) => ({
      id: `p-${x.id}`, kind: 'payment', date: x.payment_date,
      actor: '', actorInitials: initials, actorAvatar: p.avatarUrl,
      subject: formatCurrency(Number(x.amount)), verb: 'ödemen hesabına geçti',
      when: relPast(x.payment_date, today), meta: 'Ödeme',
      status: { label: 'Alındı', color: 'var(--color-success)', bg: 'var(--color-success-muted)' }, href: '/payments',
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const prevMonth = prevMonthOf(p.currentMonth);
  return {
    isStream, today, initials, monthName: TR_MONTHS[cm - 1],
    monthValue: measure(inMonth(p.currentMonth)), prevValue: measure(inMonth(prevMonth)),
    monthCount: inMonth(p.currentMonth).length, prevCount: inMonth(prevMonth).length,
    totalValue: measure(base), totalCount: base.length,
    draft, approved, paid, open, trend, events,
    unpricedCount: draft.filter((i) => i.cost == null).length,
    paidTotal: p.userPayments
      .filter((x) => x.status === 'PAID')
      .reduce((s, x) => s + Number(x.amount), 0),
    pendingAmount: cost(approved), draftAmount: cost(draft),
    byClient: byClient(p.userWorkItems.filter((i) => i.work_date.startsWith(p.currentMonth))),
    paidThisMonth: p.userPayments
      .filter((x) => x.status === 'PAID' && x.payment_date.startsWith(p.currentMonth))
      .reduce((s, x) => s + Number(x.amount), 0),
    best: Math.max(...trend.map((t) => t.value), 1),
  };
}

export function DashboardPersonal(props: DashboardPersonalProps) {
  const v = buildView(props);
  const unit = v.isStream ? 'harita' : 'iş';

  const valueDiff = diffText(v.monthValue - v.prevValue);
  const countDiff = diffText(v.monthCount - v.prevCount);
  const deltaPct = v.prevValue === 0 ? null : Math.round(((v.monthValue - v.prevValue) / v.prevValue) * 100);
  // "Kimin için" yalnızca birden fazla müşteri varsa bilgi taşır (tek renk çubuk = gürültü).
  const showClients = v.byClient.length > 1;

  return (
    <PageShell title="İşlerin" description={`${v.monthName} özeti`} icon={UserIcon} className="p-0 sm:p-0">
      <div className="grid xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6 p-4 sm:p-6">
          {/* 1. En sık yapılan iş: giriş + girilmesi beklenen planlar */}
          <QuickEntry isStream={v.isStream} plans={v.open} today={v.today} unpricedCount={v.unpricedCount} />

          {/* 2. Bu ay + toplam — telefonda 2×2 */}
          <section>
            <SectionHead title="Genel bakış" chip={v.monthName} />
            <div className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${v.isStream ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              <PeriodStatCard
                label={v.isStream ? 'Harita' : 'İş'}
                icon={v.isStream ? MapIcon : Briefcase}
                iconColor="var(--color-accent)"
                month={String(v.monthValue)}
                total={String(v.totalValue)}
                note={{ text: valueDiff.text, tone: valueDiff.trend }}
              />
              {v.isStream && (
                <PeriodStatCard
                  label="Yayın"
                  icon={Radio}
                  iconColor="var(--color-error)"
                  month={String(v.monthCount)}
                  total={String(v.totalCount)}
                  note={{ text: countDiff.text, tone: countDiff.trend }}
                />
              )}
              <PeriodStatCard
                label="Kazanç"
                icon={Banknote}
                iconColor="var(--color-success)"
                month={formatCurrency(v.paidThisMonth)}
                total={formatCurrency(v.paidTotal)}
                totalLabel="Toplam ödenen"
              />
              <PeriodStatCard
                label="Alacak"
                icon={Wallet}
                iconColor="var(--color-purple)"
                monthLabel="Ödeme bekliyor"
                month={formatCurrency(v.pendingAmount)}
                totalLabel="Onay bekliyor"
                total={formatCurrency(v.draftAmount)}
              />
            </div>
          </section>

          <WorkloadStrip
            openLabel={`${v.draft.length + v.approved.length + v.open.length} açık iş`}
            items={[
              { label: 'Onay bekliyor', count: v.draft.length, color: 'var(--color-text-secondary)', sub: lastLabel(v.draft) },
              { label: 'Ödeme bekliyor', count: v.approved.length, color: 'var(--color-warning)', sub: lastLabel(v.approved) },
              { label: v.isStream ? 'Planlı yayın' : 'Planlı içerik', count: v.open.length, color: 'var(--color-accent)', sub: v.open[0] ? `Sıradaki ${shortDate(v.open[0].planned_date)}` : '—' },
            ]}
          />

          {/* Grafikler telefonda gizli — orada hızlı giriş ve rakamlar yeter */}
          <div className={`hidden gap-3 sm:grid ${showClients ? 'lg:grid-cols-2' : ''}`}>
            {showClients && (
              <CapacityCard
                title="Bu ay kimin için"
                subtitle={`${v.monthName} · ${daysLeftInMonth(props.currentMonth, v.today)} gün kaldı · hak edişin`}
                chip="Bu ay"
                total={v.byClient.reduce((s, c) => s + c.amount, 0)}
                totalLabel="hak ediş"
                segments={v.byClient}
              />
            )}
            <BarsChart
              title={v.isStream ? 'Harita performansı' : 'İş performansı'}
              subtitle={`Aylık ${unit} · ortalamaya göre`}
              chip="Son 6 ay"
              data={v.trend}
              callout={deltaPct === null ? null : `${deltaPct >= 0 ? '↑' : '↓'} ${Math.abs(deltaPct)}%`}
            />
          </div>

          <ActivityFeed
            events={v.events}
            viewAllHref="/work-items"
            filters={[{ key: 'all', label: 'Tümü' }, { key: 'work', label: v.isStream ? 'Yayınlar' : 'İşler' }, { key: 'payment', label: 'Ödemeler' }]}
          />
        </div>

        {/* Profil paneli yalnızca geniş ekranda; planlar zaten sayfanın üstünde */}
        <ProfilePanel
          className="hidden xl:flex"
          userId={props.userId}
          fullName={props.fullName}
          handle={props.email.split('@')[0]}
          avatarUrl={props.avatarUrl}
          initials={v.initials}
          tiles={[
            { label: 'Katıldı', value: new Date(props.joinedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) },
            { label: 'Rol', value: props.roleLabel },
          ]}
          // Bu ayın değeri, son 6 ayın en iyi ayına oranla (100% = rekor ay)
          progress={{ label: `${v.monthName} · en iyi ayına göre`, pct: (v.monthValue / v.best) * 100 }}
          summary={{
            title: 'Ayın özeti',
            text: `Bu ay ${v.monthValue} ${unit} ${v.isStream ? 'yayınladın' : 'girdin'}${v.pendingAmount > 0 ? `, ${formatCurrency(v.pendingAmount)} alacağın var.` : '.'}`,
            primary: { href: '/payments', label: 'Ödemelerim' },
          }}
        />
      </div>
    </PageShell>
  );
}
