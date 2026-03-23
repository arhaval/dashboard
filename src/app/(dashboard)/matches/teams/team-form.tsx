'use client';

import { useActionState } from 'react';
import { createTeam } from '../match-actions';
import { tr } from '@/lib/i18n';

export function TeamForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createTeam(formData);
      return { error: 'error' in result ? result.error : undefined, success: 'success' in result };
    },
    null
  );

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
        {tr.cs2.addTeam}
      </h3>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
            {tr.cs2.teamName}
          </label>
          <input
            name="name"
            required
            placeholder="örn: Faze Clan"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        <div className="w-32">
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
            {tr.cs2.teamTag}
          </label>
          <input
            name="tag"
            required
            maxLength={5}
            placeholder={tr.cs2.teamTagPlaceholder}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm uppercase text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {isPending ? tr.team.saving : tr.actions.add}
        </button>
      </div>
      {state?.error && (
        <p className="mt-2 text-xs text-[var(--color-error)]">{state.error}</p>
      )}
    </form>
  );
}
