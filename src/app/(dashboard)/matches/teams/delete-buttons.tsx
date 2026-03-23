'use client';

import { useActionState } from 'react';
import { deleteTeam, deletePlayer } from '../match-actions';

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [, formAction, isPending] = useActionState(
    async () => {
      if (!confirm(`"${teamName}" takımını silmek istediğinize emin misiniz? Tüm oyuncuları da silinecek.`)) {
        return null;
      }
      return await deleteTeam(teamId);
    },
    null
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
      >
        {isPending ? '...' : 'Sil'}
      </button>
    </form>
  );
}

export function DeletePlayerButton({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [, formAction, isPending] = useActionState(
    async () => {
      if (!confirm(`"${playerName}" oyuncusunu silmek istediğinize emin misiniz?`)) {
        return null;
      }
      return await deletePlayer(playerId);
    },
    null
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
      >
        ×
      </button>
    </form>
  );
}
