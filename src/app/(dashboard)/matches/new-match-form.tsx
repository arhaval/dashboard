'use client';

import { useState, useActionState } from 'react';
import { createMatch } from './match-actions';
import { tr } from '@/lib/i18n';
import type { CS2Team } from '@/types';

export function NewMatchForm({ teams }: { teams: CS2Team[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createMatch(formData);
      if ('success' in result && result.success) setIsOpen(false);
      return { error: 'error' in result ? result.error : undefined, success: 'success' in result };
    },
    null
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        + {tr.cs2.addMatch}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
        {tr.cs2.addMatch}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Takım 1</label>
          <select
            name="team1_id"
            required
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="">{tr.cs2.selectTeam}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                [{t.tag}] {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Takım 2</label>
          <select
            name="team2_id"
            required
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="">{tr.cs2.selectTeam}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                [{t.tag}] {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{tr.cs2.matchDate}</label>
          <input
            name="match_date"
            type="datetime-local"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {isPending ? tr.team.saving : tr.cs2.addMatch}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          {tr.actions.cancel}
        </button>
        {state?.error && (
          <span className="text-xs text-[var(--color-error)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
