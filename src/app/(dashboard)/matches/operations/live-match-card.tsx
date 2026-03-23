'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { pollDatHostMap } from '../match-actions';
import { tr } from '@/lib/i18n';
import { DATHOST_MAP_STATUS_COLORS, DATHOST_POLL_INTERVAL_MS } from '@/constants';
import type { CS2Match, CS2MatchMap, DatHostLiveScore } from '@/types';

interface LiveMatchCardProps {
  match: CS2Match;
}

export function LiveMatchCard({ match }: LiveMatchCardProps) {
  const t = tr.cs2.dathost;
  const maps = match.maps || [];
  const team1Tag = match.team1?.tag || 'T1';
  const team2Tag = match.team2?.tag || 'T2';

  // Series score
  let seriesTeam1 = 0;
  let seriesTeam2 = 0;
  for (const m of maps) {
    if (m.winner_team_id === match.team1_id) seriesTeam1++;
    else if (m.winner_team_id === match.team2_id) seriesTeam2++;
  }

  // Active map
  const activeMap = maps.find(
    (m) =>
      m.dathost_status === 'CREATED' ||
      m.dathost_status === 'WAITING_PLAYERS' ||
      m.dathost_status === 'LIVE',
  );

  const [liveScore, setLiveScore] = useState<DatHostLiveScore | null>(null);

  const poll = useCallback(async () => {
    if (!activeMap) return;
    const result = await pollDatHostMap(activeMap.id);
    if (result.data) setLiveScore(result.data);
  }, [activeMap]);

  useEffect(() => {
    if (!activeMap) return;
    poll();
    const interval = setInterval(poll, DATHOST_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeMap, poll]);

  const mapScore1 = liveScore?.team1_score ?? activeMap?.team1_score ?? 0;
  const mapScore2 = liveScore?.team2_score ?? activeMap?.team2_score ?? 0;
  const rounds = liveScore?.rounds_played ?? activeMap?.rounds_played ?? 0;

  const statusBadge = activeMap?.dathost_status;
  const statusLabel = statusBadge
    ? t.mapStatus[statusBadge as keyof typeof t.mapStatus] || statusBadge
    : null;
  const statusColor = statusBadge
    ? DATHOST_MAP_STATUS_COLORS[statusBadge] || ''
    : '';

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-md border border-[#2A2A2A] bg-[#141414] p-4 hover:border-[#FF4D00]/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#FAFAFA]">
          {team1Tag} vs {team2Tag}
        </span>
        <span className="text-xs text-[#6B6B6B]">
          BO{maps.length > 0 ? Math.max(maps.length, 3) : 3}
        </span>
      </div>

      {/* Series Score */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="text-lg font-bold text-[#FAFAFA] tabular-nums">{seriesTeam1}</span>
        <span className="text-xs text-[#6B6B6B]">—</span>
        <span className="text-lg font-bold text-[#FAFAFA] tabular-nums">{seriesTeam2}</span>
      </div>

      {/* Active Map */}
      {activeMap && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {statusBadge && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                {statusBadge === 'LIVE' && (
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
                {statusLabel}
              </span>
            )}
            <span className="text-xs text-[#A1A1A1]">
              Map {activeMap.map_number}: {activeMap.map.replace('de_', '')}
            </span>
          </div>

          {statusBadge === 'LIVE' && (
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-medium text-[#FAFAFA] tabular-nums">{mapScore1}</span>
              <span className="text-xs text-[#6B6B6B]">—</span>
              <span className="text-sm font-medium text-[#FAFAFA] tabular-nums">{mapScore2}</span>
              <span className="text-xs text-[#6B6B6B]">R:{rounds}</span>
            </div>
          )}
        </div>
      )}

      {/* No active map */}
      {!activeMap && maps.length > 0 && (
        <p className="text-xs text-[#6B6B6B]">{t.startNextMap}</p>
      )}
    </Link>
  );
}
