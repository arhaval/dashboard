'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import type { CS2PlayerLeaderboardEntry } from '@/types';

const TEAM_COLORS: Record<string, { bg: string; text: string }> = {
  AK47: { bg: 'bg-red-900/40', text: 'text-red-400' },
  BHEAM: { bg: 'bg-blue-900/40', text: 'text-blue-400' },
  MAMBA: { bg: 'bg-emerald-900/40', text: 'text-emerald-400' },
  BORU: { bg: 'bg-cyan-900/40', text: 'text-cyan-400' },
  BUSC: { bg: 'bg-purple-900/40', text: 'text-purple-400' },
  CRMSN: { bg: 'bg-rose-900/40', text: 'text-rose-400' },
  GEGEN: { bg: 'bg-yellow-900/40', text: 'text-yellow-400' },
  HIZAL: { bg: 'bg-orange-900/40', text: 'text-orange-400' },
  METAL: { bg: 'bg-zinc-700/40', text: 'text-zinc-300' },
  SIKLA: { bg: 'bg-lime-900/40', text: 'text-lime-400' },
  DD: { bg: 'bg-pink-900/40', text: 'text-pink-400' },
  TG: { bg: 'bg-teal-900/40', text: 'text-teal-400' },
  TYT: { bg: 'bg-indigo-900/40', text: 'text-indigo-400' },
};

type SortKey =
  | 'avg_adr'
  | 'avg_kd'
  | 'avg_kda'
  | 'total_kills'
  | 'total_deaths'
  | 'total_assists'
  | 'hs_percent'
  | 'total_mvps'
  | 'maps_played'
  | 'entry_rate'
  | 'clutch_rate';

interface Column {
  key: SortKey;
  label: string;
  format: (entry: CS2PlayerLeaderboardEntry) => string;
  highlight?: (entry: CS2PlayerLeaderboardEntry) => string;
}

const COLUMNS: Column[] = [
  {
    key: 'maps_played',
    label: tr.cs2.mapsPlayed,
    format: (e) => String(e.maps_played),
  },
  {
    key: 'total_kills',
    label: tr.cs2.totalKills,
    format: (e) => String(e.total_kills),
  },
  {
    key: 'total_deaths',
    label: tr.cs2.totalDeaths,
    format: (e) => String(e.total_deaths),
  },
  {
    key: 'total_assists',
    label: tr.cs2.totalAssists,
    format: (e) => String(e.total_assists),
  },
  {
    key: 'avg_kd',
    label: tr.cs2.avgKd,
    format: (e) => e.avg_kd.toFixed(2),
    highlight: (e) =>
      e.avg_kd >= 1.2
        ? 'text-[var(--color-success)]'
        : e.avg_kd >= 1.0
        ? 'text-[var(--color-text-primary)]'
        : 'text-red-400',
  },
  {
    key: 'avg_kda',
    label: tr.cs2.avgKda,
    format: (e) => e.avg_kda.toFixed(2),
    highlight: (e) =>
      e.avg_kda >= 1.5
        ? 'text-[var(--color-success)]'
        : e.avg_kda >= 1.0
        ? 'text-[var(--color-text-primary)]'
        : 'text-red-400',
  },
  {
    key: 'avg_adr',
    label: tr.cs2.avgAdr,
    format: (e) => e.avg_adr.toFixed(1),
    highlight: (e) =>
      e.avg_adr >= 80
        ? 'text-[var(--color-success)]'
        : e.avg_adr >= 60
        ? 'text-[var(--color-text-primary)]'
        : 'text-[var(--color-text-muted)]',
  },
  {
    key: 'hs_percent',
    label: tr.cs2.hsPercent,
    format: (e) => `${e.hs_percent.toFixed(0)}%`,
  },
  {
    key: 'entry_rate',
    label: tr.cs2.entryRate,
    format: (e) => `${e.total_entry_successes}/${e.total_entry_attempts}`,
  },
  {
    key: 'clutch_rate',
    label: tr.cs2.clutchRate,
    format: (e) => `${e.total_clutch_wins}/${e.total_clutch_attempts}`,
  },
  {
    key: 'total_mvps',
    label: tr.cs2.stats.mvps,
    format: (e) => String(e.total_mvps),
  },
];

function getSortValue(entry: CS2PlayerLeaderboardEntry, key: SortKey): number {
  switch (key) {
    case 'avg_adr':
      return entry.avg_adr;
    case 'avg_kd':
      return entry.avg_kd;
    case 'avg_kda':
      return entry.avg_kda;
    case 'total_kills':
      return entry.total_kills;
    case 'total_deaths':
      return entry.total_deaths;
    case 'total_assists':
      return entry.total_assists;
    case 'hs_percent':
      return entry.hs_percent;
    case 'total_mvps':
      return entry.total_mvps;
    case 'maps_played':
      return entry.maps_played;
    case 'entry_rate':
      return entry.total_entry_attempts > 0
        ? entry.total_entry_successes / entry.total_entry_attempts
        : 0;
    case 'clutch_rate':
      return entry.total_clutch_attempts > 0
        ? entry.total_clutch_wins / entry.total_clutch_attempts
        : 0;
  }
}

export function LeaderboardTable({ data }: { data: CS2PlayerLeaderboardEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('avg_adr');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      return sortAsc ? va - vb : vb - va;
    });
    return copy;
  }, [data, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-3 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.rank}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">
              {tr.cs2.player}
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={cn(
                  'cursor-pointer select-none px-2 py-2 text-center text-xs font-medium transition-colors hover:text-[var(--color-accent)]',
                  sortKey === col.key
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)]'
                )}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-0.5">{sortAsc ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, index) => (
            <tr
              key={entry.steam_id}
              className={cn(
                'border-b border-[var(--color-border)] last:border-b-0',
                index % 2 === 0
                  ? 'bg-[var(--color-table-row-even)]'
                  : 'bg-[var(--color-table-row-odd)]'
              )}
            >
              {/* Rank */}
              <td className="px-3 py-2 text-center">
                <span
                  className={cn(
                    'font-mono text-sm font-bold',
                    index === 0
                      ? 'text-yellow-400'
                      : index === 1
                      ? 'text-gray-300'
                      : index === 2
                      ? 'text-amber-600'
                      : 'text-[var(--color-text-muted)]'
                  )}
                >
                  {index + 1}
                </span>
              </td>

              {/* Player Name + Team Tag */}
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-mono text-xs font-semibold',
                      TEAM_COLORS[entry.team_tag]?.bg || 'bg-[var(--color-accent-muted)]',
                      TEAM_COLORS[entry.team_tag]?.text || 'text-[var(--color-accent)]'
                    )}
                  >
                    {entry.team_tag}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {entry.player_name}
                  </span>
                </div>
              </td>

              {/* Data columns */}
              {COLUMNS.map((col) => {
                const value = col.format(entry);
                const colorClass = col.highlight
                  ? col.highlight(entry)
                  : 'text-[var(--color-text-primary)]';

                return (
                  <td
                    key={col.key}
                    className={cn(
                      'px-2 py-2 text-center font-mono text-sm',
                      colorClass,
                      sortKey === col.key && 'font-semibold'
                    )}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
