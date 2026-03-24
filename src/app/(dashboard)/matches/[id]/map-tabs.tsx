'use client';

/**
 * MapTabs — Tabbed view of per-map stats (K/D/A/ADR/KDA)
 * Groups players by team, sorted by kills descending
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CS2MatchMap, CS2MatchPlayer } from '@/types';

interface MapTabsProps {
  maps: CS2MatchMap[];
  team1Id: string;
  team2Id: string;
  team1Tag: string;
  team2Tag: string;
}

function computeKDA(kills: number, deaths: number, assists: number): string {
  return ((kills + assists) / Math.max(deaths, 1)).toFixed(2);
}

function PlayerRow({ player }: { player: CS2MatchPlayer }) {
  const kda = computeKDA(player.kills, player.deaths, player.assists);

  return (
    <tr className="border-b border-[var(--color-border)] last:border-b-0 odd:bg-[var(--color-table-row-odd)] even:bg-[var(--color-table-row-even)]">
      <td className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">
        {player.player?.name || player.player_name}
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
      <td className="px-2 py-2 text-center font-mono text-sm text-[var(--color-accent)]">
        {kda}
      </td>
    </tr>
  );
}

function TeamStatsTable({
  players,
  teamTag,
  isWinner,
}: {
  players: CS2MatchPlayer[];
  teamTag: string;
  isWinner: boolean;
}) {
  if (players.length === 0) return null;

  const sorted = [...players].sort((a, b) => b.kills - a.kills);

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 border-b',
          isWinner
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]'
        )}
      >
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-accent)]">
          {teamTag}
        </span>
        {isWinner && (
          <span className="text-xs font-medium text-[var(--color-success)]">Kazanan</span>
        )}
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Oyuncu</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">K</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">D</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">A</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">ADR</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">KDA</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MapTabs({ maps, team1Id, team2Id, team1Tag, team2Tag }: MapTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (maps.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        Henüz map verisi yok
      </div>
    );
  }

  const activeMap = maps[activeTab];
  if (!activeMap) return null;

  const team1Players = (activeMap.players || []).filter((p) => p.team_id === team1Id);
  const team2Players = (activeMap.players || []).filter((p) => p.team_id === team2Id);
  const mapWinner = activeMap.winner_team_id;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {maps.map((map, index) => (
          <button
            key={map.id}
            onClick={() => setActiveTab(index)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
              index === activeTab
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            Map {map.map_number}
          </button>
        ))}
      </div>

      {/* Map header with score */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {activeMap.map}
          </span>
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
              {activeMap.team1_score}
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
              {activeMap.team2_score}
            </span>
            <span className="font-mono text-xs text-[var(--color-text-muted)]">{team2Tag}</span>
          </div>
          {activeMap.rounds_played > 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {activeMap.rounds_played} round
            </span>
          )}
        </div>
      </div>

      {/* Player stats */}
      <div className="space-y-3">
        <TeamStatsTable
          players={team1Players}
          teamTag={team1Tag}
          isWinner={mapWinner === team1Id}
        />
        <TeamStatsTable
          players={team2Players}
          teamTag={team2Tag}
          isWinner={mapWinner === team2Id}
        />
      </div>
    </div>
  );
}
