/**
 * İçerik Hedefleri Sayfası
 * Haftalık platform + alt tür bazlı hedef ayarlama ve bu haftanın ilerlemesi
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { contentGoalService, userService } from '@/services';
import { GoalSettingsClient } from './goal-settings-client';
import { WeeklyProgressCards } from './weekly-progress-cards';
import { Target, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ContentGoalsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';

  const [goals, weeklyProgress] = await Promise.all([
    contentGoalService.getAll(),
    contentGoalService.getWeeklyProgress(),
  ]);

  const weekLabel = contentGoalService.getCurrentWeekLabel();

  // Overall: toplam hedef vs tamamlanan
  const activeGoals = weeklyProgress.filter((g) => g.weekly_target > 0);
  const totalTarget = activeGoals.reduce((s, g) => s + g.weekly_target, 0);
  const totalDone = activeGoals.reduce((s, g) => s + g.done_this_week, 0);
  const hitCount = activeGoals.filter((g) => g.on_track).length;

  return (
    <PageShell
      title="İçerik Hedefleri"
      description={`Bu hafta: ${weekLabel}`}
    >
      {/* ── Nav Tabs ── */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        <a href="/content" className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
          Takvim
        </a>
        <a href="/content/performance" className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
          Performans & ROI
        </a>
        <a href="/content/goals" className="border-b-2 border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
          Haftalık Hedefler
        </a>
      </div>

      {/* ── Bu Hafta Özet ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-muted)]">
              <Target className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Bu Hafta Tamamlanan
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {totalDone}
                <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
                  / {totalTarget}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-success-muted)]">
              <CalendarDays className="h-5 w-5 text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Hedefe Ulaşılan
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {hitCount}
                <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
                  / {activeGoals.length} kategori
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${
              totalTarget > 0 && totalDone >= totalTarget
                ? 'bg-[var(--color-success-muted)]'
                : 'bg-[var(--color-warning-muted)]'
            }`}>
              <span className="text-xl">
                {totalTarget > 0 && totalDone >= totalTarget ? '🎯' : '📈'}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Genel İlerleme
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0}
                <span className="ml-0.5 text-sm font-normal text-[var(--color-text-muted)]">%</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Bu Hafta İlerleme (3/5) ── */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Bu Hafta İlerleme
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">{weekLabel}</p>
            </CardHeader>
            <CardContent>
              <WeeklyProgressCards progress={weeklyProgress} />
            </CardContent>
          </Card>
        </div>

        {/* ── Hedef Ayarları (2/5) ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                Haftalık Hedefler
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">
                {isAdmin ? 'Her kategori için haftalık hedefi ayarla' : 'Hedefler admin tarafından belirlenir'}
              </p>
            </CardHeader>
            <CardContent>
              <GoalSettingsClient goals={goals} isAdmin={isAdmin} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
