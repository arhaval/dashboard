'use client';

/**
 * LiveMapBanner — Polling live score display with pulsing indicator
 * Polls pollDatHostMap every 10 seconds, refreshes page when match finishes
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pollDatHostMap } from '../match-actions';
import { DATHOST_POLL_INTERVAL_MS } from '@/constants';
import type { DatHostLiveScore } from '@/types';

interface LiveMapBannerProps {
  mapId: string;
  mapName: string;
  team1Tag: string;
  team2Tag: string;
  initialScore: {
    team1: number;
    team2: number;
    rounds: number;
  };
}

export function LiveMapBanner({
  mapId,
  mapName,
  team1Tag,
  team2Tag,
  initialScore,
}: LiveMapBannerProps) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [finished, setFinished] = useState(false);

  const poll = useCallback(async () => {
    const result = await pollDatHostMap(mapId);
    if (result?.data) {
      const data: DatHostLiveScore = result.data;
      setScore({
        team1: data.team1_score,
        team2: data.team2_score,
        rounds: data.rounds_played,
      });
      if (data.finished || data.cancelled) {
        setFinished(true);
        // Refresh the page to show final stats
        router.refresh();
      }
    }
  }, [mapId, router]);

  useEffect(() => {
    if (finished) return;

    const interval = setInterval(poll, DATHOST_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll, finished]);

  return (
    <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/5 p-4">
      <div className="flex items-center justify-between">
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-semibold uppercase text-red-400">
            {finished ? 'Bitti' : 'Canlı'}
          </span>
        </div>

        {/* Map name */}
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {mapName}
        </span>

        {/* Round count */}
        <span className="text-xs text-[var(--color-text-muted)]">
          Round {score.rounds}
        </span>
      </div>

      {/* Score */}
      <div className="mt-3 flex items-center justify-center gap-4">
        <span className="font-mono text-xs text-[var(--color-text-muted)]">{team1Tag}</span>
        <span className="font-mono text-3xl font-bold text-[var(--color-text-primary)]">
          {score.team1}
        </span>
        <span className="text-lg text-[var(--color-text-muted)]">—</span>
        <span className="font-mono text-3xl font-bold text-[var(--color-text-primary)]">
          {score.team2}
        </span>
        <span className="font-mono text-xs text-[var(--color-text-muted)]">{team2Tag}</span>
      </div>
    </div>
  );
}
