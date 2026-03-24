/**
 * TeamStandings — Puan durumu tablosu
 * Her kazanılan harita = 1 puan
 */

import type { CS2TeamStanding } from '@/types';

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
              Maç
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-muted)]">
              Galibiyet
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-muted)]">
              Harita
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-muted)]">
              Harita Galibiyet
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-accent)]">
              Puan
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((team, index) => (
            <tr
              key={team.team_id}
              className={
                index % 2 === 0
                  ? 'bg-[var(--color-bg-primary)]'
                  : 'bg-[var(--color-bg-secondary)]'
              }
            >
              <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">
                {index + 1}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-accent)]">
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
              <td className="px-4 py-3 text-center font-mono text-sm text-[var(--color-text-secondary)]">
                {team.maps_played}
              </td>
              <td className="px-4 py-3 text-center font-mono text-sm text-[var(--color-text-primary)]">
                {team.maps_won}
              </td>
              <td className="px-4 py-3 text-center font-mono text-lg font-bold text-[var(--color-accent)]">
                {team.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
