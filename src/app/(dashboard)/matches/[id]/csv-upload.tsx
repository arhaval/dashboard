'use client';

import { useActionState } from 'react';
import { uploadMapCSV } from '../match-actions';
import { tr } from '@/lib/i18n';
import { CS2_MAPS } from '@/constants';

interface CsvUploadProps {
  matchId: string;
  team1Tag: string;
  team2Tag: string;
}

export function CsvUpload({ matchId, team1Tag, team2Tag }: CsvUploadProps) {
  const [state, formAction, isPending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean; playersCount?: number; mapNumber?: number } | null,
      formData: FormData
    ) => {
      const result = await uploadMapCSV(matchId, formData);
      return {
        error: 'error' in result ? result.error : undefined,
        success: 'success' in result && result.success,
        playersCount: 'playersCount' in result ? result.playersCount : undefined,
        mapNumber: 'mapNumber' in result ? result.mapNumber : undefined,
      };
    },
    null
  );

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
        {tr.cs2.uploadCsv}
      </h3>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        {tr.cs2.uploadCsvDesc}
      </p>

      {/* Map + Scores */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
            {tr.cs2.map}
          </label>
          <select
            name="map"
            required
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="">{tr.cs2.selectMap}</option>
            {CS2_MAPS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
            {team1Tag} Skor
          </label>
          <input
            name="team1_score"
            type="number"
            min="0"
            max="99"
            required
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
            {team2Tag} Skor
          </label>
          <input
            name="team2_score"
            type="number"
            min="0"
            max="99"
            required
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* CSV File */}
      <div className="mb-4">
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
          CSV
        </label>
        <input
          name="csv_file"
          type="file"
          accept=".csv,.txt"
          required
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--color-bg-tertiary)] file:px-3 file:py-1 file:text-xs file:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {tr.cs2.csvFormatHelp}
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {isPending ? tr.cs2.uploading : tr.cs2.uploadAndSave}
        </button>

        {state?.error && (
          <span className="text-xs text-[var(--color-error)]">{state.error}</span>
        )}
        {state?.success && (
          <span className="text-xs text-[var(--color-success)]">
            Map {state.mapNumber}: {state.playersCount} oyuncu kaydedildi
          </span>
        )}
      </div>
    </form>
  );
}
