/**
 * Player Leaderboard Page
 * Aggregated stats across all maps — sortable by any column
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService } from '@/services';
import { tr } from '@/lib/i18n';
import { LeaderboardTable } from './leaderboard-table';

export default async function StatsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const leaderboard = await cs2Service.getPlayerLeaderboard();

  return (
    <PageShell
      title={tr.cs2.leaderboard}
      description={tr.cs2.leaderboardDesc}
      actions={
        <Link
          href="/matches"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          ← {tr.cs2.title}
        </Link>
      }
    >
      {leaderboard.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          {tr.cs2.noLeaderboardData}
        </div>
      ) : (
        <LeaderboardTable data={leaderboard} />
      )}
    </PageShell>
  );
}
