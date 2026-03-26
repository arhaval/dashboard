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

interface PageProps {
  searchParams: Promise<{ status?: string; week?: string }>;
}

/** Get unique weeks from matches sorted by date */
function getWeeks(matches: CS2Match[]): { label: string; date: string }[] {
  const uniqueDates = [...new Set(matches.map((m) => m.match_date.split('T')[0]))].sort();
  return uniqueDates.map((date, i) => ({
    label: `${i + 1}. Hafta`,
    date,
  }));
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

/** Get series score from match record */
function getSeriesScore(match: CS2Match): { team1: number; team2: number } {
  return {
    team1: match.team1_maps_won ?? 0,
    team2: match.team2_maps_won ?? 0,
  };
}

export default async function MatchesPage({ searchParams }: PageProps) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';
  const params = await searchParams;

  const filters = {
    status: params.status as CS2MatchStatus | undefined,
  };

  const allMatches = await cs2Service.getMatches(filters);
  const weeks = getWeeks(allMatches);
  const selectedWeek = params.week || '';

  // Filter by week if selected
  const matches = selectedWeek
    ? allMatches.filter((m) => m.match_date.split('T')[0] === selectedWeek)
    : allMatches;

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
            <>
              <Link
                href="/matches/operations"
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-bg-tertiary)]"
              >
                Operasyonlar
              </Link>
              <Link
                href="/matches/teams"
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
              >
                {tr.cs2.teams}
              </Link>
            </>
          )}
        </div>
      }
    >
      {/* Week Filter */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/matches"
          className={cn(
            'rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors',
            !selectedWeek
              ? 'bg-[var(--color-accent)] text-white'
              : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
          )}
        >
          Tümü
        </Link>
        {weeks.map((week) => (
          <Link
            key={week.date}
            href={`/matches?week=${week.date}`}
            className={cn(
              'rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors',
              selectedWeek === week.date
                ? 'bg-[var(--color-accent)] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
            )}
          >
            {week.label}
          </Link>
        ))}
      </div>

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

              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
