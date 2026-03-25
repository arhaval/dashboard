/**
 * TeamStandings — Puan durumu tablosu
 * Puan = kazanılan harita sayısı
 * Sıralama: Puan → Galibiyet → Alfabe
 */

import type { CS2TeamStanding } from '@/types';

// Takım tag'lerine göre renkler — koyu arka planda okunabilir
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
};

function getTeamColor(tag: string) {
  return TEAM_COLORS[tag] || { bg: 'bg-[var(--color-accent-muted)]', text: 'text-[var(--color-accent)]' };
}

interface TeamStandingsProps {
  data: CS2TeamStanding[];
}

export function TeamStandings({ data }: TeamStandingsProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">
              Takım
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-muted)]">
              Oynanan Maç
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-muted)]">
              Galibiyet
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-muted)]">
              Kazanılan Harita
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-accent)]">
              Puan
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((team, index) => {
            const color = getTeamColor(team.team_tag);
            return (
              <tr
                key={team.team_id}
                className={
                  index % 2 === 0
                    ? 'bg-[var(--color-bg-primary)]'
                    : 'bg-[var(--color-bg-secondary)]'
                }
              >
                <td className="px-4 py-3 font-mono text-sm font-bold">
                  <span
                    className={
                      index === 0
                        ? 'text-yellow-400'
                        : index === 1
                        ? 'text-gray-300'
                        : index === 2
                        ? 'text-amber-600'
                        : 'text-[var(--color-text-muted)]'
                    }
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${color.bg} ${color.text}`}
                    >
                      {team.team_tag}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {team.team_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-[var(--color-text-secondary)]">
                  {team.matches_played}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {team.matches_won}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-[var(--color-text-primary)]">
                  {team.maps_won}
                </td>
                <td className="px-4 py-3 text-center font-mono text-lg font-bold text-[var(--color-accent)]">
                  {team.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
