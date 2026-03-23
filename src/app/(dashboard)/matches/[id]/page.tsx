/**
 * Match Detail Page (Series)
 * Series score card + per-map scores & player stats + CSV upload
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService } from '@/services';
import { tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CS2_MATCH_STATUS_COLORS } from '@/constants';
import type { CS2MatchStatus, CS2MatchPlayer, CS2MatchMap, CS2Match } from '@/types';
import { CsvUpload } from './csv-upload';
import { DatHostPanel } from './dathost-panel';
import { dathostService } from '@/services';

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

function PlayerStatsTable({
  players,
  teamTag,
  isWinner,
}: {
  players: CS2MatchPlayer[];
  teamTag: string;
  isWinner: boolean;
}) {
  if (players.length === 0) return null;

  // Sort by kills descending
  const sorted = [...players].sort((a, b) => b.kills - a.kills);

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      {/* Team Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2',
          isWinner
            ? 'bg-green-500/10 border-b border-green-500/20'
            : 'bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]'
        )}
      >
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-accent)]">
          {teamTag}
        </span>
        {isWinner && (
          <span className="text-xs font-medium text-[var(--color-success)]">Kazanan</span>
        )}
      </div>

      {/* Stats Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">
              Oyuncu
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.kills}
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.deaths}
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.assists}
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.headshots}
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.adr}
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.entryKills}
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.clutches}
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.stats.mvps}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player, index) => {
            const kdRatio = player.deaths > 0
              ? (player.kills / player.deaths).toFixed(2)
              : player.kills.toFixed(2);
            const hsPercent = player.kills > 0
              ? Math.round((player.headshots / player.kills) * 100)
              : 0;

            return (
              <tr
                key={player.id}
                className={cn(
                  'border-b border-[var(--color-border)] last:border-b-0',
                  index % 2 === 0
                    ? 'bg-[var(--color-table-row-even)]'
                    : 'bg-[var(--color-table-row-odd)]'
                )}
              >
                <td className="px-4 py-2">
                  <div>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {player.player?.name || player.player_name}
                    </span>
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      K/D {kdRatio}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {player.kills}
                </td>
                <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {player.deaths}
                </td>
                <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {player.assists}
                </td>
                <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {player.headshots}
                  <span className="ml-0.5 text-xs text-[var(--color-text-muted)]">
                    ({hsPercent}%)
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <span
                    className={cn(
                      'font-mono text-sm',
                      player.adr >= 80
                        ? 'text-[var(--color-success)]'
                        : player.adr >= 60
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)]'
                    )}
                  >
                    {player.adr.toFixed(1)}
                  </span>
                </td>
                <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {player.entry_successes}/{player.entry_attempts}
                </td>
                <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {player.clutch_wins}/{player.clutch_attempts}
                </td>
                <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-accent)]">
                  {player.mvps > 0 ? player.mvps : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MapSection({
  map,
  team1Id,
  team2Id,
  team1Tag,
  team2Tag,
}: {
  map: CS2MatchMap;
  team1Id: string;
  team2Id: string;
  team1Tag: string;
  team2Tag: string;
}) {
  const team1Players = (map.players || []).filter((p) => p.team_id === team1Id);
  const team2Players = (map.players || []).filter((p) => p.team_id === team2Id);
  const mapWinner = map.winner_team_id;

  return (
    <div className="space-y-3">
      {/* Map Header with Score */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-accent)]">
              Map {map.map_number}
            </span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {map.map}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[var(--color-text-muted)]">{team1Tag}</span>
            <span
              className={cn(
                'font-mono text-xl font-bold',
                mapWinner === team1Id
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-text-primary)]'
              )}
            >
              {map.team1_score}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">—</span>
            <span
              className={cn(
                'font-mono text-xl font-bold',
                mapWinner === team2Id
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-text-primary)]'
              )}
            >
              {map.team2_score}
            </span>
            <span className="font-mono text-xs text-[var(--color-text-muted)]">{team2Tag}</span>
          </div>

          {map.rounds_played > 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {map.rounds_played} {tr.cs2.round.toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {/* Player Stats for this map */}
      <PlayerStatsTable
        players={team1Players}
        teamTag={team1Tag}
        isWinner={mapWinner === team1Id}
      />
      <PlayerStatsTable
        players={team2Players}
        teamTag={team2Tag}
        isWinner={mapWinner === team2Id}
      />
    </div>
  );
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

  const team1Tag = match.team1?.tag || '???';
  const team2Tag = match.team2?.tag || '???';

  const maps = match.maps || [];
  const series = getSeriesScore(match);
  const hasMaps = maps.length > 0;

  // Fetch DatHost servers for admin panel
  const dathostServers = isAdmin ? await dathostService.getServers() : [];

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

      {/* Maps + Player Stats */}
      {hasMaps ? (
        <div className="space-y-8">
          {maps.map((map) => (
            <MapSection
              key={map.id}
              map={map}
              team1Id={match.team1_id}
              team2Id={match.team2_id}
              team1Tag={team1Tag}
              team2Tag={team2Tag}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
          {tr.cs2.noStatsYet}
        </div>
      )}

      {/* DatHost Panel (admin, series not finished) */}
      {isAdmin && (match.status === 'PENDING' || match.status === 'LIVE') && (
        <div className="mt-6">
          <DatHostPanel match={match} maps={maps} servers={dathostServers} />
        </div>
      )}

      {/* CSV Upload (admin) */}
      {isAdmin && (
        <div className="mt-6">
          <CsvUpload matchId={match.id} team1Tag={team1Tag} team2Tag={team2Tag} />
        </div>
      )}

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
