'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pollDatHostMap } from '../match-actions';
import { DATHOST_POLL_INTERVAL_MS } from '@/constants';
import type { DatHostLiveScore } from '@/types';

interface LiveMapDisplayProps {
  mapId: string;
  mapName: string;
  team1Name: string;
  team2Name: string;
  initialScore: { team1: number; team2: number; rounds: number };
  dathostStatus: string;
}

export function LiveMapDisplay({
  mapId,
  mapName,
  team1Name,
  team2Name,
  initialScore,
  dathostStatus,
}: LiveMapDisplayProps) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [status, setStatus] = useState(dathostStatus);

  const poll = useCallback(async () => {
    const result = await pollDatHostMap(mapId);
    if (result.data) {
      setScore({
        team1: result.data.team1_score,
        team2: result.data.team2_score,
        rounds: result.data.rounds_played,
      });
      if (result.data.finished || result.data.cancelled) {
        setStatus('FINISHED');
        router.refresh();
      } else if (result.data.rounds_played > 0) {
        setStatus('LIVE');
      }
    }
  }, [mapId, router]);

  useEffect(() => {
    if (status === 'FINISHED' || status === 'CANCELLED') return;
    const interval = setInterval(poll, DATHOST_POLL_INTERVAL_MS);
    poll(); // initial poll
    return () => clearInterval(interval);
  }, [poll, status]);

  const isLive = status === 'LIVE';
  const isWaiting = status === 'CREATED' || status === 'WAITING_PLAYERS';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isLive && (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-medium">LIVE</span>
          </span>
        )}
        {isWaiting && (
          <span className="text-xs text-yellow-400">Oyuncular bekleniyor...</span>
        )}
        <span className="text-xs text-[var(--color-text-muted)]">{mapName.replace('de_', '')}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <span className="text-sm text-[var(--color-text-primary)] font-medium truncate max-w-[100px]">{team1Name}</span>
        <span className="text-2xl font-mono text-[var(--color-text-primary)] font-bold">
          {score.team1} <span className="text-[var(--color-text-muted)]">-</span> {score.team2}
        </span>
        <span className="text-sm text-[var(--color-text-primary)] font-medium truncate max-w-[100px]">{team2Name}</span>
      </div>

      {isLive && (
        <div className="text-center">
          <span className="text-xs text-[var(--color-text-muted)]">R:{score.rounds}</span>
        </div>
      )}
    </div>
  );
}
