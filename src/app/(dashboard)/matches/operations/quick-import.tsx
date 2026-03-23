'use client';

import { useActionState } from 'react';
import { importFromDathost } from '../match-actions';

type ImportState = {
  error?: string;
  success?: boolean;
  matchId?: string;
  team1Name?: string;
  team2Name?: string;
  score?: string;
  map?: string;
  playersCount?: number;
  mapNumber?: number;
} | null;

export function QuickImport() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: ImportState, formData: FormData) => {
      const result = await importFromDathost(formData);
      if ('error' in result) return { error: result.error as string };
      return {
        success: true,
        matchId: (result as { matchId?: string }).matchId,
        team1Name: (result as { team1Name?: string }).team1Name,
        team2Name: (result as { team2Name?: string }).team2Name,
        score: (result as { score?: string }).score,
        map: (result as { map?: string }).map,
        playersCount: (result as { playersCount?: number }).playersCount,
        mapNumber: (result as { mapNumber?: number }).mapNumber,
      };
    },
    null,
  );

  return (
    <div className="rounded-md border border-[#2A2A2A] bg-[#141414] p-4 space-y-3">
      <h3 className="text-sm font-medium text-[#FAFAFA]">DatHost Match ID ile İçe Aktar</h3>
      <p className="text-xs text-[#6B6B6B]">
        Match ID girin — takımlar, oyuncular ve istatistikler otomatik oluşturulur
      </p>

      <form action={formAction} className="flex items-end gap-2">
        <div className="flex-1">
          <input
            name="dathost_match_id"
            required
            placeholder="DatHost Match ID yapıştırın"
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#6B6B6B] font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Çekiliyor...' : 'İçe Aktar'}
        </button>
      </form>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      {state?.success && (
        <div className="rounded border border-green-500/20 bg-green-500/10 p-3 space-y-1">
          <p className="text-sm font-medium text-green-400">Başarıyla içe aktarıldı!</p>
          <p className="text-xs text-[#A1A1A1]">
            {state.team1Name} vs {state.team2Name} — {state.map?.replace('de_', '')} — {state.score} ({state.playersCount} oyuncu)
          </p>
          <a
            href={`/matches/${state.matchId}`}
            className="inline-block mt-1 text-xs text-[#FF4D00] hover:text-[#FF6B2C]"
          >
            Maç detayına git →
          </a>
        </div>
      )}
    </div>
  );
}
