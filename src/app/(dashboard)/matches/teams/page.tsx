/**
 * Teams Management Page
 * Admin-only: Create teams, add players with Steam IDs
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService } from '@/services';
import { tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TeamForm } from './team-form';
import { PlayerForm } from './player-form';
import { DeleteTeamButton, DeletePlayerButton } from './delete-buttons';

export default async function TeamsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const teams = await cs2Service.getTeams();

  return (
    <PageShell
      title={tr.cs2.teamManagement}
      description="Takımları ve oyuncuları yönetin"
      actions={
        <Link
          href="/matches"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          ← {tr.cs2.title}
        </Link>
      }
    >
      {/* Add Team Form */}
      <div className="mb-6">
        <TeamForm />
      </div>

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          {tr.cs2.noTeams}
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            >
              {/* Team Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] px-2 py-1 font-mono text-sm font-semibold text-[var(--color-accent)]">
                    {team.tag}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {team.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {team.players?.length || 0} {tr.cs2.players.toLowerCase()}
                  </span>
                </div>
                <DeleteTeamButton teamId={team.id} teamName={team.name} />
              </div>

              {/* Players */}
              {team.players && team.players.length > 0 && (
                <div className="mb-3 space-y-1">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        'flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-1.5',
                        'bg-[var(--color-bg-primary)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--color-text-primary)]">
                          {player.name}
                        </span>
                        <span className="font-mono text-xs text-[var(--color-text-muted)]">
                          {player.steam_id}
                        </span>
                        {!player.is_active && (
                          <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-xs text-red-400">
                            {tr.cs2.inactive}
                          </span>
                        )}
                      </div>
                      <DeletePlayerButton playerId={player.id} playerName={player.name} />
                    </div>
                  ))}
                </div>
              )}

              {/* Add Player Form */}
              <PlayerForm teamId={team.id} />
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
