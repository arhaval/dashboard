/**
 * Admin Dashboard View — "Arhaval Dashboard"
 * Analytics-style command center (TailAdmin layout): KPI cards → area chart →
 * tables + pipeline → monthly stack + type donut. Same data as before.
 */

import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { ContentAreaChart } from '@/components/charts/content-charts';
import { ArrowRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { WorkItem, User, WeeklyGoalProgress } from '@/types';
import type { DaySchedule } from '@/services/weekly-schedule.utils';
import {
  deriveStage,
  STAGE_LABELS_MAP,
  type ContentQueueItem,
  type ContentStage,
} from './icerik-plani/content-queue.constants';

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
  total: number; pending: number; paid: number; cancelled: number; totalAmount: number;
}
interface ContentStats {
  thisMonth: { voice: number; edit: number; total: number };
  lastMonth: { voice: number; edit: number; total: number };
  change: number;
}
interface ContentTrendPoint {
  month: string; label: string; voice: number; edit: number; total: number;
}
interface TeamContentEntry {
  userId: string; name: string; voice: number; edit: number; total: number;
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

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function getWorkItemTitle(item: WorkItem): string {
  return item.match_name || item.content_name || item.work_type;
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Small green/red "▲ 12% geçen ay" delta badge. */
function Delta({ change, suffix = 'geçen ay' }: { change: number | null; suffix?: string }) {
  if (change === null) {
    return <span className="text-xs text-[var(--color-text-muted)]">yeni</span>;
  }
  const up = change >= 0;
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
          up
            ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
            : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
        )}
      >
        {up ? '▲' : '▼'} {Math.abs(change)}%
      </span>
      <span className="text-xs text-[var(--color-text-muted)]">{suffix}</span>
    </span>
  );
}

function KpiCard({
  label, value, right,
}: {
  label: string; value: string; right: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <CardContent className="p-0">
        <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
        <div className="mt-3.5 flex items-end justify-between gap-2">
          <span className="text-[30px] font-bold leading-none tracking-tight text-[var(--color-text-primary)] tabular-nums">
            {value}
          </span>
          <span className="flex items-center pb-1">{right}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PanelHead({ title, href, linkText = 'Tümü' }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5">
      <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
          {linkText} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
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
  unpaidTotal,
  contentStats,
  contentTrend,
  teamContentStats,
  currentMonth,
}: DashboardAdminProps) {
  const activeMembers = allUsers.filter((u) => u.is_active && u.role !== 'ADMIN');
  const [, m] = currentMonth.split('-').map(Number);
  const monthLabel = TR_MONTHS[m - 1];

  // Action items
  const pendingPayment = allWorkItems
    .filter((i) => i.status === 'APPROVED' && i.cost)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const pendingApproval = allWorkItems
    .filter((i) => i.status === 'DRAFT')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const actionRows = [
    ...pendingPayment.map((i) => ({ item: i, right: formatCurrency(i.cost ?? 0), money: true })),
    ...pendingApproval.map((i) => ({ item: i, right: 'Onay', money: false })),
  ].slice(0, 5);

  // Pipeline (Hat Durumu)
  const active = contentQueue.filter((c) => c.status !== 'YAYINLANDI');
  const stageCount = (s: ContentStage) => active.filter((c) => deriveStage(c) === s).length;
  const pipe = {
    METIN: stageCount('METIN'),
    SES: stageCount('SES'),
    EDITOR: stageCount('EDITOR'),
    HAZIR: stageCount('HAZIR'),
  };
  const activeJobs = pipe.METIN + pipe.SES + pipe.EDITOR + pipe.HAZIR;

  // Monthly stacked bars
  const maxTotal = Math.max(...contentTrend.map((d) => d.total), 1);

  // Type donut (this month voice vs edit)
  const tV = contentStats.thisMonth.voice;
  const tE = contentStats.thisMonth.edit;
  const tTot = tV + tE;
  const voicePct = tTot > 0 ? (tV / tTot) * 100 : 0;

  const team = teamContentStats.slice(0, 5);

  return (
    <PageShell title="Arhaval Dashboard" description={`${monthLabel} · içerik ve operasyon analitiği`}>

      {/* ═══ KPI ROW ═══ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Bu Ay İçerik"
          value={String(contentStats.thisMonth.total)}
          right={<Delta change={contentStats.change ?? pctChange(contentStats.thisMonth.total, contentStats.lastMonth.total)} />}
        />
        <KpiCard
          label="Seslendirme"
          value={String(contentStats.thisMonth.voice)}
          right={<Delta change={pctChange(contentStats.thisMonth.voice, contentStats.lastMonth.voice)} />}
        />
        <KpiCard
          label="Kurgu"
          value={String(contentStats.thisMonth.edit)}
          right={<Delta change={pctChange(contentStats.thisMonth.edit, contentStats.lastMonth.edit)} />}
        />
        <KpiCard
          label="Ödenmemiş"
          value={formatCurrency(unpaidTotal)}
          right={
            unpaidTotal > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="rounded-full bg-[var(--color-error-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--color-error)]">
                  {paymentStats.pending} iş
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">bekliyor</span>
              </span>
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">temiz</span>
            )
          }
        />
      </div>

      {/* ═══ AREA CHART ═══ */}
      <Card className="mt-5">
        <CardContent className="p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">İçerik Üretimi</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Son 6 ayın aylık üretimi</p>
            </div>
            <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              Son 6 ay
            </span>
          </div>
          <ContentAreaChart data={contentTrend} />
        </CardContent>
      </Card>

      {/* ═══ 3-COL: Ekip · Aksiyon · Hat ═══ */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Ekip Performansı */}
        <Card>
          <PanelHead title="Ekip Performansı" href="/team" linkText="Ekip" />
          <CardContent className="px-5 pb-5 pt-3">
            {team.length === 0 ? (
              <div className="flex h-28 items-center justify-center text-sm text-[var(--color-text-muted)]">
                Bu ay içerik yok
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    <th className="pb-2.5 text-left font-normal">Kişi</th>
                    <th className="pb-2.5 text-right font-normal">İçerik</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((t) => (
                    <tr key={t.userId} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 text-sm text-[var(--color-text-primary)]">{t.name}</td>
                      <td className="py-3 text-right text-sm font-medium text-[var(--color-text-secondary)] tabular-nums">
                        {t.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Aksiyon Bekleyenler */}
        <Card>
          <PanelHead title="Aksiyon Bekleyenler" href="/work-items" linkText={`Tümü · ${pendingApproval.length}`} />
          <CardContent className="px-5 pb-5 pt-3">
            {actionRows.length === 0 ? (
              <div className="flex h-28 items-center justify-center text-sm text-[var(--color-text-muted)]">
                Bekleyen iş yok
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    <th className="pb-2.5 text-left font-normal">İş</th>
                    <th className="pb-2.5 text-right font-normal">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {actionRows.map(({ item, right, money }) => (
                    <tr key={item.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="max-w-0 py-3 pr-3">
                        <p className="truncate text-sm text-[var(--color-text-primary)]">{getWorkItemTitle(item)}</p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">{item.user?.full_name}</p>
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap py-3 text-right text-sm tabular-nums',
                          money ? 'font-medium text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'
                        )}
                      >
                        {right}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Hat Durumu */}
        <Card>
          <PanelHead title="Hat Durumu" href="/icerik-plani" linkText="İçerik Planı" />
          <CardContent className="px-5 pb-5 pt-4">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
              </span>
              <span className="text-sm text-[var(--color-text-secondary)]">
                <b className="text-[var(--color-text-primary)]">{activeJobs}</b> aktif iş
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['METIN', pipe.METIN],
                ['SES', pipe.SES],
                ['EDITOR', pipe.EDITOR],
                ['HAZIR', pipe.HAZIR],
              ] as const).map(([stage, n]) => (
                <div
                  key={stage}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 py-3"
                >
                  <div className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums">{n}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{STAGE_LABELS_MAP[stage]}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ 2-COL: Monthly stack · Type donut ═══ */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Monthly stacked bars */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent)' }} /> Seslendirme
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-info)' }} /> Kurgu
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                Toplam: {contentTrend.reduce((s, d) => s + d.total, 0)}
              </span>
            </div>
            <div className="flex h-44 items-end justify-between gap-3">
              {contentTrend.map((d) => {
                const h = (d.total / maxTotal) * 100;
                const vShare = d.total > 0 ? (d.voice / d.total) * 100 : 0;
                return (
                  <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full max-w-[32px] flex-1 items-end">
                      <div
                        className="flex w-full flex-col overflow-hidden rounded-md"
                        style={{ height: `${Math.max(h, 3)}%` }}
                      >
                        <div style={{ height: `${100 - vShare}%`, background: 'var(--color-info)' }} />
                        <div style={{ height: `${vShare}%`, background: 'var(--color-accent)' }} />
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Type donut */}
        <Card>
          <PanelHead title="İçerik Dağılımı" />
          <CardContent className="flex flex-col items-center px-5 pb-6 pt-5">
            <svg width="170" height="170" viewBox="0 0 42 42" role="img" aria-label="İçerik dağılımı">
              <circle cx="21" cy="21" r="15.915" fill="none" style={{ stroke: 'var(--color-surface-sunken)' }} strokeWidth="5" />
              {tTot > 0 && (
                <>
                  <circle
                    cx="21" cy="21" r="15.915" fill="none"
                    style={{ stroke: 'var(--color-accent)' }} strokeWidth="5"
                    strokeDasharray={`${voicePct} ${100 - voicePct}`} strokeDashoffset="25"
                  />
                  <circle
                    cx="21" cy="21" r="15.915" fill="none"
                    style={{ stroke: 'var(--color-info)' }} strokeWidth="5"
                    strokeDasharray={`${100 - voicePct} ${voicePct}`} strokeDashoffset={`${25 - voicePct}`}
                  />
                </>
              )}
              <text x="21" y="20.5" textAnchor="middle" style={{ fill: 'var(--color-text-primary)' }} fontSize="6" fontWeight="700">
                {tTot}
              </text>
              <text x="21" y="25.5" textAnchor="middle" style={{ fill: 'var(--color-text-muted)' }} fontSize="2.6">
                içerik
              </text>
            </svg>
            <div className="mt-4 flex gap-5 text-xs text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-accent)' }} /> Seslendirme {tV}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-info)' }} /> Kurgu {tE}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        {activeMembers.length} aktif üye içerik üretiyor
      </p>
    </PageShell>
  );
}
