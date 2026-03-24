/**
 * Stats Page — Team Standings + Player Leaderboard
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService } from '@/services';
import { tr } from '@/lib/i18n';
import { LeaderboardTable } from './leaderboard-table';
import { TeamStandings } from './team-standings';

export default async function StatsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const [standings, leaderboard] = await Promise.all([
    cs2Service.getTeamStandings(),
    cs2Service.getPlayerLeaderboard(),
  ]);

  return (
    <PageShell
      title="İstatistikler"
      description="Takım puan durumu ve oyuncu istatistikleri"
      actions={
        <Link
          href="/matches"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          ← Turnuva
        </Link>
      }
    >
      {/* Team Standings */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Puan Durumu
        </h2>
        {standings.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            Henüz tamamlanmış maç yok
          </div>
        ) : (
          <TeamStandings data={standings} />
        )}
      </div>

      {/* Player Leaderboard */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Oyuncu Sıralaması
        </h2>
        {leaderboard.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            {tr.cs2.noLeaderboardData}
          </div>
        ) : (
          <LeaderboardTable data={leaderboard} />
        )}
      </div>
    </PageShell>
  );
}
