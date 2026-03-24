'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { startNextMap, resetServer } from '../match-actions';
import { CS2_MAPS } from '@/constants';
import { Button } from '@/components/ui/button';
import { IdleServerForm } from './idle-server-form';
import { LiveMapDisplay } from './live-map-display';
import { FinishedMapAccordion } from './finished-map-accordion';
import type { DatHostServer, CS2Team, CS2MatchMap } from '@/types';

interface ServerCardProps {
  server: DatHostServer;
  teams: CS2Team[];
}

export function ServerCard({ server, teams }: ServerCardProps) {
  const match = server.current_match;
  const maps = match?.maps || [];
  const finishedMaps = maps.filter((m) => m.dathost_status === 'FINISHED');
  const activeMap = maps.find(
    (m) => m.dathost_status && ['CREATED', 'WAITING_PLAYERS', 'LIVE'].includes(m.dathost_status)
  );

  // Series score
  let team1Wins = 0;
  let team2Wins = 0;
  for (const m of finishedMaps) {
    if (m.winner_team_id === match?.team1_id) team1Wins++;
    else if (m.winner_team_id === match?.team2_id) team2Wins++;
  }
  // Determine card state (no auto-finish, always play 3 maps, admin finishes manually)
  const allMaps = [...finishedMaps];
  const isIdle = !match;
  const isLive = !!activeMap;
  const isBetweenMaps = match && !activeMap && allMaps.length < 3 && match.status === 'LIVE';
  const isSeriesComplete = match && allMaps.length >= 3 && !activeMap && match.status === 'LIVE';

  return (
    <div className="border border-[#2A2A2A] rounded-[6px] bg-[#141414] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#FAFAFA]">{server.name}</span>
        {isIdle && <span className="rounded-full px-2 py-0.5 text-xs bg-green-500/15 text-green-400">IDLE</span>}
        {isLive && <span className="rounded-full px-2 py-0.5 text-xs bg-red-500/15 text-red-400">LIVE</span>}
        {isBetweenMaps && <span className="rounded-full px-2 py-0.5 text-xs bg-yellow-500/15 text-yellow-400">Seri: {team1Wins}-{team2Wins}</span>}
        {isSeriesComplete && <span className="rounded-full px-2 py-0.5 text-xs bg-green-500/15 text-green-400">BITTI</span>}
      </div>

      {/* Match header for active/finished series */}
      {match && (
        <Link
          href={`/matches/${match.id}`}
          className="block text-center text-sm text-[#A1A1A1] transition-colors hover:text-[#FF4D00]"
        >
          <span className="text-[#FAFAFA]">{match.team1?.name}</span>
          {isSeriesComplete && <span className="font-mono text-[#FF4D00]"> {team1Wins}-{team2Wins} </span>}
          {!isSeriesComplete && <span className="text-[#6B6B6B]"> vs </span>}
          <span className="text-[#FAFAFA]">{match.team2?.name}</span>
        </Link>
      )}

      {/* IDLE: show start form */}
      {isIdle && <IdleServerForm serverId={server.id} teams={teams} />}

      {/* Finished maps as accordions */}
      {finishedMaps.length > 0 && (
        <div className="space-y-1">
          {finishedMaps.map((m) => (
            <FinishedMapAccordion
              key={m.id}
              map={m}
              team1Name={match?.team1?.name || 'Team 1'}
              team2Name={match?.team2?.name || 'Team 2'}
              team1Id={match?.team1_id || ''}
            />
          ))}
        </div>
      )}

      {/* LIVE: show live score */}
      {isLive && activeMap && match && (
        <LiveMapDisplay
          mapId={activeMap.id}
          mapName={activeMap.map}
          team1Name={match.team1?.name || 'Team 1'}
          team2Name={match.team2?.name || 'Team 2'}
          initialScore={{
            team1: activeMap.team1_score,
            team2: activeMap.team2_score,
            rounds: activeMap.rounds_played,
          }}
          dathostStatus={activeMap.dathost_status || 'CREATED'}
        />
      )}

      {/* Between maps: start next map */}
      {isBetweenMaps && <NextMapForm serverId={server.id} />}

      {/* Series complete: reset button */}
      {isSeriesComplete && <ResetButton serverId={server.id} />}
    </div>
  );
}

function NextMapForm({ serverId }: { serverId: string }) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await startNextMap(serverId, formData);
      if (result && 'error' in result && result.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <select
        name="map"
        required
        className="flex-1 bg-[#1F1F1F] border border-[#2A2A2A] rounded-[4px] px-2 py-1.5 text-sm text-[#FAFAFA]"
      >
        <option value="">Harita sec</option>
        {CS2_MAPS.map((m) => (
          <option key={m} value={m}>{m.replace('de_', '')}</option>
        ))}
      </select>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? '...' : 'Sonraki Map'}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}

function ResetButton({ serverId }: { serverId: string }) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError('');
    startTransition(async () => {
      const result = await resetServer(serverId);
      if (result && 'error' in result && result.error) setError(result.error);
    });
  }

  return (
    <div>
      <Button type="button" onClick={handleClick} disabled={pending} variant="outline" size="sm" className="w-full">
        {pending ? '...' : 'Yeni Mac Baslat'}
      </Button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
