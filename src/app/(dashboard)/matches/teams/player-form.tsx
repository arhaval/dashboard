'use client';

import { useActionState } from 'react';
import { createPlayer } from '../match-actions';
import { tr } from '@/lib/i18n';

export function PlayerForm({ teamId }: { teamId: string }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createPlayer(formData);
      return { error: 'error' in result ? result.error : undefined, success: 'success' in result };
    },
    null
  );

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="team_id" value={teamId} />
      <div className="flex-1">
        <input
          name="name"
          required
          placeholder={tr.cs2.playerName}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>
      <div className="flex-1">
        <input
          name="steam_id"
          required
          placeholder={tr.cs2.steamIdPlaceholder}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 font-mono text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
      >
        {isPending ? '...' : tr.cs2.addPlayer}
      </button>
      {state?.error && (
        <span className="text-xs text-[var(--color-error)]">{state.error}</span>
      )}
    </form>
  );
}
