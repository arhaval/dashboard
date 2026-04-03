/**
 * Content Calendar Page
 * İçerik takvimi ve planlama — Ana sayfa
 * Server component that loads plans, renders CalendarGrid and StatCards.
 */

import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageShell } from '@/components/layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { contentPlanService, userService } from '@/services';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ContentCalendarClient } from './content-calendar-client';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

interface ContentPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';
  const params = await searchParams;
  const month = params.month ?? getCurrentMonth();

  const [plans, stats, userStats, availableMonths, allMembers] = await Promise.all([
    contentPlanService.getByMonth(month),
    contentPlanService.getMonthStats(month),
    isAdmin ? contentPlanService.getUserStats(month) : Promise.resolve([]),
    contentPlanService.getAvailableMonths(),
    isAdmin ? userService.getAll() : Promise.resolve([]),
  ]);

  const members = allMembers
    .filter((u) => u.is_active)
    .map((u) => ({ id: u.id, full_name: u.full_name }));

  // Format month label (e.g. "Nisan 2026")
  const [y, m] = month.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <PageShell
      title="İçerik Takvimi"
      description={`${monthLabel} — ${plans.length} içerik planlandı`}
    >
      {/* ── Nav Tabs ── */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        <a
          href={`/content?month=${month}`}
          className="border-b-2 border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]"
        >
          Takvim
        </a>
        <a
          href={`/content/performance?month=${month}`}
          className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Performans & ROI
        </a>
      </div>

      {/* ── StatCards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Toplam Plan"
          value={String(plans.length)}
          description={monthLabel}
          icon={CalendarDays}
          color="blue"
        />
        <StatCard
          title="Tamamlanan"
          value={String(stats.done)}
          description={`${stats.completionRate}% tamamlandı`}
          icon={CheckCircle2}
          color="green"
          change={
            stats.completionRate > 0
              ? { value: `${stats.completionRate}%`, positive: true }
              : undefined
          }
        />
        <StatCard
          title="Devam Eden"
          value={String(stats.inProgress)}
          description="aktif görev"
          icon={TrendingUp}
          color="orange"
        />
        <StatCard
          title="Planlandı"
          value={String(stats.planned)}
          description="bekleyen görev"
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Gecikmiş"
          value={String(stats.overdue)}
          description="geçmiş tarih"
          icon={AlertCircle}
          color={stats.overdue > 0 ? 'red' : 'teal'}
        />
        <StatCard
          title="Ekip Üyesi"
          value={String(userStats.length)}
          description="atanmış kişi"
          icon={Users}
          color="teal"
        />
      </div>

      {/* ── Calendar + User Stats ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Calendar — 3/4 width */}
        <div className="xl:col-span-3">
          <ContentCalendarClient
            plans={plans}
            month={month}
            isAdmin={isAdmin}
            availableMonths={availableMonths}
            members={members}
            currentMonth={getCurrentMonth()}
          />
        </div>

        {/* Sidebar: User stats — 1/4 width */}
        <div className="space-y-4">
          {/* Team Performance */}
          {userStats.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Ekip Performansı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userStats.map((u) => {
                  const total = u.planned + u.done;
                  const pct = total > 0 ? Math.round((u.done / total) * 100) : 0;
                  return (
                    <div key={u.userId}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                          {u.done}/{total}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-success)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {u.overdue > 0 && (
                        <p className="mt-0.5 text-[10px] text-[var(--color-error)]">
                          {u.overdue} gecikmiş
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Renk Kılavuzu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { color: 'bg-[var(--color-info-muted)] text-[var(--color-info)] border-[var(--color-info)]/20', label: 'Seslendirme' },
                { color: 'bg-[var(--color-success-muted)] text-[var(--color-success)] border-[var(--color-success)]/20', label: 'Kurgu' },
                { color: 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/20', label: 'Yayın' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium border ${item.color}`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
              <div className="mt-2 space-y-1.5 border-t border-[var(--color-border)] pt-2">
                {[
                  { dot: 'bg-[var(--color-error)]', label: 'Acil öncelik' },
                  { dot: 'bg-[var(--color-warning)]', label: 'Yüksek öncelik' },
                  { dot: 'bg-[var(--color-text-muted)]', label: 'Normal öncelik' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.dot}`} />
                    <span className="text-[11px] text-[var(--color-text-muted)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Durum Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: 'Tamamlanan',
                  value: stats.done,
                  total: plans.length,
                  color: 'bg-[var(--color-success)]',
                },
                {
                  label: 'Devam Eden',
                  value: stats.inProgress,
                  total: plans.length,
                  color: 'bg-[var(--color-warning)]',
                },
                {
                  label: 'Bekleyen',
                  value: stats.planned,
                  total: plans.length,
                  color: 'bg-[var(--color-info)]',
                },
                {
                  label: 'İptal',
                  value: stats.cancelled,
                  total: plans.length,
                  color: 'bg-[var(--color-border)]',
                },
              ].map((row) => {
                const pct = plans.length > 0 ? Math.round((row.value / plans.length) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        {row.label}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {row.value}
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                      <div
                        className={`h-full rounded-full transition-all ${row.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
