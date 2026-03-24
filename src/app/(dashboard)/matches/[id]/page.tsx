/**
 * Match Detail Page (Series)
 * Series score card + map tabs with player stats + live controls
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService } from '@/services';
import { tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CS2_MATCH_STATUS_COLORS } from '@/constants';
import type { CS2MatchStatus, CS2Match } from '@/types';
import { MapTabs } from './map-tabs';
import { LiveMapBanner } from './live-map-banner';
import { StartNextMap } from './start-next-map';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Calculate series score: how many maps each team won */
function getSeriesScore(match: CS2Match): { team1: number; team2: number } {
  const maps = match.maps || [];
  let team1 = 0;
  let team2 = 0;

  for (const map of maps) {
    if (map.winner_team_id === match.team1_id) team1++;
    else if (map.winner_team_id === match.team2_id) team2++;
  }

  return { team1, team2 };
}

export default async function MatchDetailPage({ params }: PageProps) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';
  const { id } = await params;
  const match = await cs2Service.getMatchById(id);
  if (!match) notFound();

  const statusColor = CS2_MATCH_STATUS_COLORS[match.status as CS2MatchStatus] || '';
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';

  const team1Tag = match.team1?.tag || '???';
  const team2Tag = match.team2?.tag || '???';

  const maps = match.maps || [];
  const series = getSeriesScore(match);
  const hasMaps = maps.length > 0;

  // Find active map (DatHost CREATED, WAITING_PLAYERS, or LIVE)
  const activeMap = maps.find(
    (m) =>
      m.dathost_status === 'CREATED' ||
      m.dathost_status === 'WAITING_PLAYERS' ||
      m.dathost_status === 'LIVE',
  );

  // Check if between maps (series LIVE, no active map, series not over)
  const seriesOver = series.team1 >= 2 || series.team2 >= 2;
  const isBetweenMaps = isLive && !activeMap && !seriesOver;

  return (
    <PageShell
      title={`${team1Tag} vs ${team2Tag}`}
      description={formatMatchDate(match.match_date)}
      actions={
        <Link
          href="/matches"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          ← {tr.cs2.title}
        </Link>
      }
    >
      {/* Series Score Card */}
      <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColor)}>
            {tr.cs2.status[match.status as CS2MatchStatus]}
          </span>
          {hasMaps && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {maps.length} map
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-3 py-1 font-mono text-lg font-bold text-[var(--color-accent)]">
              {team1Tag}
            </span>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{match.team1?.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={cn(
                'font-mono text-4xl font-bold',
                isFinished && match.winner_team_id === match.team1_id
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-text-primary)]'
              )}
            >
              {series.team1}
            </span>
            <span className="text-lg text-[var(--color-text-muted)]">—</span>
            <span
              className={cn(
                'font-mono text-4xl font-bold',
                isFinished && match.winner_team_id === match.team2_id
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-text-primary)]'
              )}
            >
              {series.team2}
            </span>
          </div>

          <div className="text-center">
            <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-3 py-1 font-mono text-lg font-bold text-[var(--color-accent)]">
              {team2Tag}
            </span>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{match.team2?.name}</p>
          </div>
        </div>

        {/* Per-map score summary */}
        {hasMaps && (
          <div className="mt-4 flex items-center justify-center gap-3">
            {maps.map((map) => (
              <span
                key={map.id}
                className="rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-muted)]"
              >
                {map.map.replace('de_', '')} {map.team1_score}:{map.team2_score}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Live Map Banner (when there's an active DatHost map) */}
      {isAdmin && activeMap && (
        <div className="mb-6">
          <LiveMapBanner
            mapId={activeMap.id}
            mapName={activeMap.map}
            team1Tag={team1Tag}
            team2Tag={team2Tag}
            initialScore={{
              team1: activeMap.team1_score,
              team2: activeMap.team2_score,
              rounds: activeMap.rounds_played,
            }}
          />
        </div>
      )}

      {/* Start Next Map (admin, series LIVE, between maps) */}
      {isAdmin && isBetweenMaps && (
        <div className="mb-6">
          <StartNextMap matchId={match.id} />
        </div>
      )}

      {/* Map Tabs with Player Stats */}
      <MapTabs
        maps={maps}
        team1Id={match.team1_id}
        team2Id={match.team2_id}
        team1Tag={team1Tag}
        team2Tag={team2Tag}
      />

      {/* Notes */}
      {match.notes && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h3 className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Notlar</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{match.notes}</p>
        </div>
      )}
    </PageShell>
  );
}
