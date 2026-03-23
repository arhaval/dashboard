/**
 * Matches List Page
 * Shows all CS2 matches (series) with map scores
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService } from '@/services';
import { tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CS2_MATCH_STATUS_COLORS } from '@/constants';
import type { CS2MatchStatus, CS2Match } from '@/types';
import { MatchFilters } from './match-filters';
import { NewMatchForm } from './new-match-form';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Calculate series score: how many maps each team won */
function getSeriesScore(match: CS2Match): { team1: number; team2: number; mapNames: string[] } {
  const maps = match.maps || [];
  let team1 = 0;
  let team2 = 0;
  const mapNames: string[] = [];

  for (const map of maps) {
    mapNames.push(map.map);
    if (map.winner_team_id === match.team1_id) team1++;
    else if (map.winner_team_id === match.team2_id) team2++;
  }

  return { team1, team2, mapNames };
}

export default async function MatchesPage({ searchParams }: PageProps) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';
  const params = await searchParams;

  const filters = {
    status: params.status as CS2MatchStatus | undefined,
  };

  const [matches, teams] = await Promise.all([
    cs2Service.getMatches(filters),
    isAdmin ? cs2Service.getTeams() : Promise.resolve([]),
  ]);

  return (
    <PageShell
      title={tr.cs2.title}
      description={tr.cs2.subtitle}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/matches/stats"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
          >
            {tr.cs2.leaderboard}
          </Link>
          {isAdmin && (
            <Link
              href="/matches/teams"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              {tr.cs2.teams}
            </Link>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div className="mb-6">
        <MatchFilters />
      </div>

      {/* New Match Form (admin only) */}
      {isAdmin && (
        <div className="mb-6">
          <NewMatchForm teams={teams} />
        </div>
      )}

      {/* Match List */}
      {matches.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          {tr.cs2.noMatches}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((match) => {
            const statusColor = CS2_MATCH_STATUS_COLORS[match.status as CS2MatchStatus] || '';
            const isFinished = match.status === 'FINISHED';
            const series = getSeriesScore(match);
            const mapCount = (match.maps || []).length;

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="group rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 transition-colors hover:border-[var(--color-accent)]"
              >
                {/* Status + Maps + Date */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColor)}>
                      {tr.cs2.status[match.status as CS2MatchStatus]}
                    </span>
                    {mapCount > 0 && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {series.mapNames.join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {formatMatchDate(match.match_date)}
                  </span>
                </div>

                {/* Series Score */}
                <div className="flex items-center justify-center gap-4">
                  <div className="flex-1 text-right">
                    <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-2 py-0.5 font-mono text-sm font-semibold text-[var(--color-accent)]">
                      {match.team1?.tag || '???'}
                    </span>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {match.team1?.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-mono text-2xl font-bold',
                        isFinished && match.winner_team_id === match.team1_id
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-text-primary)]'
                      )}
                    >
                      {series.team1}
                    </span>
                    <span className="text-sm text-[var(--color-text-muted)]">—</span>
                    <span
                      className={cn(
                        'font-mono text-2xl font-bold',
                        isFinished && match.winner_team_id === match.team2_id
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-text-primary)]'
                      )}
                    >
                      {series.team2}
                    </span>
                  </div>

                  <div className="flex-1">
                    <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-2 py-0.5 font-mono text-sm font-semibold text-[var(--color-accent)]">
                      {match.team2?.tag || '???'}
                    </span>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {match.team2?.name}
                    </p>
                  </div>
                </div>

                {/* Per-map scores */}
                {mapCount > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-3">
                    {(match.maps || []).map((map) => (
                      <span
                        key={map.id}
                        className="rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-muted)]"
                      >
                        {map.map.replace('de_', '')} {map.team1_score}:{map.team2_score}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
