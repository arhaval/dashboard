'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { tr } from '@/lib/i18n';
import { CS2_MATCH_STATUSES } from '@/constants';

export function MatchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/matches?${params.toString()}`);
  }

  return (
    <div className="flex gap-3">
      <select
        value={searchParams.get('status') || ''}
        onChange={(e) => updateFilter('status', e.target.value)}
        className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
      >
        <option value="">{tr.cs2.allStatuses}</option>
        {CS2_MATCH_STATUSES.map((s) => (
          <option key={s} value={s}>
            {tr.cs2.status[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
