'use client';

/**
 * StartNextMap — Map selection + start button for match detail page
 * Shown when series is LIVE and no active map is running
 */

import { useState, useTransition } from 'react';
import { startNextMapForMatch } from '../match-actions';
import { CS2_MAPS } from '@/constants';
import { Button } from '@/components/ui/button';

interface StartNextMapProps {
  matchId: string;
}

export function StartNextMap({ matchId }: StartNextMapProps) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await startNextMapForMatch(matchId, formData);
      if (result && 'error' in result && result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Bir hata oluştu');
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
        Sonraki Map
      </h3>
      <form action={handleSubmit} className="flex items-center gap-3">
        <select
          name="map"
          required
          className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="">Harita seç</option>
          {CS2_MAPS.map((m) => (
            <option key={m} value={m}>
              {m.replace('de_', '')}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? 'Başlatılıyor...' : 'Sonraki Map Başlat'}
        </Button>
      </form>
      {error && (
        <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>
      )}
    </div>
  );
}
