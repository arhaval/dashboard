'use client';

/**
 * MatchControls — Cancel map, cancel series, delete match buttons
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelDatHostMap, cancelSeries, deleteMatch } from '../match-actions';

interface MatchControlsProps {
  matchId: string;
  matchStatus: string;
  activeMapId?: string;
}

export function MatchControls({ matchId, matchStatus, activeMapId }: MatchControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = matchStatus === 'LIVE';
  const isPending = matchStatus === 'PENDING';
  const isFinished = matchStatus === 'FINISHED';
  const isCancelled = matchStatus === 'CANCELLED';

  async function handleCancelMap() {
    if (!activeMapId) return;
    setLoading('cancelMap');
    setError(null);
    const result = await cancelDatHostMap(activeMapId);
    if (result && 'error' in result) {
      setError(typeof result.error === 'string' ? result.error : 'Map iptal edilemedi');
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  async function handleCancelSeries() {
    setLoading('cancelSeries');
    setError(null);
    const result = await cancelSeries(matchId);
    if (result && 'error' in result) {
      setError(typeof result.error === 'string' ? result.error : 'Seri iptal edilemedi');
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading('delete');
    setError(null);
    const result = await deleteMatch(matchId);
    if (result && 'error' in result) {
      setError(typeof result.error === 'string' ? result.error : 'Maç silinemedi');
    } else {
      router.push('/matches');
    }
    setLoading(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="w-full text-xs text-red-400">{error}</span>
      )}

      {/* Cancel active map */}
      {isLive && activeMapId && (
        <button
          onClick={handleCancelMap}
          disabled={loading !== null}
          className="rounded-[var(--radius-sm)] border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20 disabled:opacity-50"
        >
          {loading === 'cancelMap' ? 'İptal ediliyor...' : 'Map İptal Et'}
        </button>
      )}

      {/* Cancel entire series */}
      {(isLive || isPending) && (
        <button
          onClick={handleCancelSeries}
          disabled={loading !== null}
          className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {loading === 'cancelSeries' ? 'İptal ediliyor...' : 'Maçı İptal Et'}
        </button>
      )}

      {/* Delete match */}
      {(isFinished || isCancelled || isPending) && (
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {loading === 'delete'
            ? 'Siliniyor...'
            : confirmDelete
              ? 'Emin misin? Tıkla'
              : 'Maçı Sil'}
        </button>
      )}

      {confirmDelete && (
        <button
          onClick={() => setConfirmDelete(false)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        >
          Vazgeç
        </button>
      )}
    </div>
  );
}
