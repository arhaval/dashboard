'use client';

import { useState } from 'react';
import type { CS2MatchMap } from '@/types';

interface FinishedMapAccordionProps {
  map: CS2MatchMap;
  team1Name: string;
  team2Name: string;
  team1Id: string;
}

export function FinishedMapAccordion({ map, team1Name, team2Name, team1Id }: FinishedMapAccordionProps) {
  const [open, setOpen] = useState(false);
  const players = map.players || [];
  const team1Players = players.filter((p) => p.team_id === team1Id);
  const team2Players = players.filter((p) => p.team_id !== team1Id);
  const roundsPlayed = map.rounds_played || 1;

  return (
    <div className="border border-[var(--color-border)] rounded-[4px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-[var(--color-text-muted)]">{open ? '▾' : '▸'}</span>
          <span className="text-[var(--color-text-secondary)]">Map {map.map_number}:</span>
          <span className="text-[var(--color-text-primary)]">{map.map.replace('de_', '')}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[var(--color-text-primary)] font-mono">{map.team1_score} - {map.team2_score}</span>
          <span className="text-green-400 text-xs">&#10003;</span>
        </span>
      </button>

      {open && players.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-3 py-2">
          <StatsTable label={team1Name} players={team1Players} roundsPlayed={roundsPlayed} />
          {team2Players.length > 0 && (
            <>
              <div className="h-2" />
              <StatsTable label={team2Name} players={team2Players} roundsPlayed={roundsPlayed} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatsTable({
  label,
  players,
  roundsPlayed,
}: {
  label: string;
  players: { player_name: string; kills: number; deaths: number; assists: number; damage_dealt: number; adr: number }[];
  roundsPlayed: number;
}) {
  const sorted = [...players].sort((a, b) => {
    const kdaA = (a.kills + a.assists) / Math.max(a.deaths, 1);
    const kdaB = (b.kills + b.assists) / Math.max(b.deaths, 1);
    return kdaB - kdaA;
  });

  return (
    <div>
      <div className="text-xs text-[var(--color-text-muted)] mb-1">{label}</div>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-[var(--color-text-muted)]">
            <th className="text-left py-1">Oyuncu</th>
            <th className="text-right py-1 w-8">K</th>
            <th className="text-right py-1 w-8">D</th>
            <th className="text-right py-1 w-8">A</th>
            <th className="text-right py-1 w-12">ADR</th>
            <th className="text-right py-1 w-12">KDA</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const adr = p.adr || (roundsPlayed > 0 ? p.damage_dealt / roundsPlayed : 0);
            const kda = (p.kills + p.assists) / Math.max(p.deaths, 1);
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-[var(--color-bg-tertiary)]' : 'bg-[var(--color-bg-primary)]'}>
                <td className="py-1 text-[var(--color-text-primary)] truncate max-w-[120px]">{p.player_name}</td>
                <td className="text-right py-1 text-[var(--color-text-primary)]">{p.kills}</td>
                <td className="text-right py-1 text-[var(--color-text-secondary)]">{p.deaths}</td>
                <td className="text-right py-1 text-[var(--color-text-secondary)]">{p.assists}</td>
                <td className="text-right py-1 text-[var(--color-text-primary)]">{adr.toFixed(1)}</td>
                <td className="text-right py-1 text-[var(--color-accent)]">{kda.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
