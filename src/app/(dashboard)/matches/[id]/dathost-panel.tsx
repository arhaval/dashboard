'use client';

import { useActionState, useEffect, useRef, useState, useCallback } from 'react';
import {
  startDatHostMap,
  pollDatHostMap,
  importDatHostStats,
  importFromDathost,
  cancelDatHostMap,
  finishSeries,
} from '../match-actions';
import { tr } from '@/lib/i18n';
import { CS2_MAPS, DATHOST_MAP_STATUS_COLORS, DATHOST_POLL_INTERVAL_MS } from '@/constants';
import type { CS2Match, CS2MatchMap, DatHostServer, DatHostLiveScore } from '@/types';

interface DatHostPanelProps {
  match: CS2Match;
  maps: CS2MatchMap[];
  servers: DatHostServer[];
}

type ActionState = {
  error?: string | Record<string, string[]>;
  success?: boolean;
  mapId?: string;
  playersCount?: number;
  statsImported?: boolean;
} | null;

export function DatHostPanel({ match, maps, servers }: DatHostPanelProps) {
  const t = tr.cs2.dathost;

  // Find active dathost map (CREATED, WAITING_PLAYERS, or LIVE)
  const activeMap = maps.find(
    (m) =>
      m.dathost_status === 'CREATED' ||
      m.dathost_status === 'WAITING_PLAYERS' ||
      m.dathost_status === 'LIVE',
  );

  // Find last finished map that might need import
  const finishedMapNeedingImport = maps.find(
    (m) =>
      m.dathost_status === 'FINISHED' &&
      (!m.players || m.players.length === 0),
  );

  const isSeriesActive = match.status === 'PENDING' || match.status === 'LIVE';

  return (
    <div className="rounded-md border border-[#2A2A2A] bg-[#141414] p-4 space-y-4">
      <h3 className="text-sm font-medium text-[#FAFAFA]">{t.matchControl}</h3>

      {/* Quick Import — DatHost Match ID ile bu seriye map ekle */}
      {isSeriesActive && !activeMap && (
        <QuickImportForm matchId={match.id} />
      )}

      {/* Start Map Form — shown when no active map and series is live */}
      {!activeMap && !finishedMapNeedingImport && isSeriesActive && (
        <StartMapForm matchId={match.id} servers={servers} />
      )}

      {/* Active Map Status + Polling */}
      {activeMap && (
        <ActiveMapPanel
          map={activeMap}
          match={match}
        />
      )}

      {/* Finished map needing import */}
      {finishedMapNeedingImport && (
        <FinishedMapPanel map={finishedMapNeedingImport} />
      )}

      {/* Series Controls */}
      {isSeriesActive && maps.length > 0 && (
        <SeriesControls match={match} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Import — DatHost Match ID ile map + stats çek
// ---------------------------------------------------------------------------

function QuickImportForm({ matchId }: { matchId: string }) {
  const [state, formAction, isPending] = useActionState(
    async (
      _prev: ActionState,
      formData: FormData,
    ) => {
      formData.set('match_id', matchId);
      const result = await importFromDathost(formData);
      if ('error' in result) return { error: result.error as string };
      return {
        success: true,
        detail: `${(result as { map?: string }).map?.replace('de_', '') || '?'} — ${(result as { score?: string }).score} (${(result as { playersCount?: number }).playersCount} oyuncu)`,
      };
    },
    null,
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#6B6B6B]">DatHost Match ID ile map ekle</p>
      <form action={formAction} className="flex items-end gap-2">
        <input
          name="dathost_match_id"
          required
          placeholder="DatHost Match ID"
          className="flex-1 rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#6B6B6B] font-mono"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Çekiliyor...' : 'İçe Aktar'}
        </button>
      </form>
      {state?.error && typeof state.error === 'string' && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-400">
          Başarılı: {(state as { detail?: string }).detail}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Start Map Form
// ---------------------------------------------------------------------------

function StartMapForm({
  matchId,
  servers,
}: {
  matchId: string;
  servers: DatHostServer[];
}) {
  const t = tr.cs2.dathost;
  const idleServers = servers.filter((s) => s.server_status === 'IDLE');

  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionState, formData: FormData) => {
      const result = await startDatHostMap(matchId, formData);
      return {
        error: 'error' in result ? (result.error as string) : undefined,
        success: 'success' in result && result.success,
        mapId: 'mapId' in result ? (result.mapId as string) : undefined,
      };
    },
    null,
  );

  if (idleServers.length === 0) {
    return (
      <p className="text-sm text-[#6B6B6B]">{t.noServers}</p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">{t.selectServer}</label>
          <select
            name="server_id"
            required
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA]"
          >
            {idleServers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">{tr.cs2.selectMap}</label>
          <select
            name="map"
            required
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA]"
          >
            {CS2_MAPS.map((m) => (
              <option key={m} value={m}>
                {m.replace('de_', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && typeof state.error === 'string' && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50"
      >
        {isPending ? '...' : t.startMap}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Active Map Panel (polling)
// ---------------------------------------------------------------------------

function ActiveMapPanel({
  map,
  match,
}: {
  map: CS2MatchMap;
  match: CS2Match;
}) {
  const t = tr.cs2.dathost;
  const [liveScore, setLiveScore] = useState<DatHostLiveScore | null>(null);
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const result = await pollDatHostMap(map.id);
    if (result.data) {
      setLiveScore(result.data);
      if (result.data.finished || result.data.cancelled) {
        setPolling(false);
      }
    }
  }, [map.id]);

  useEffect(() => {
    if (!polling) return;

    // Immediate poll
    poll();

    intervalRef.current = setInterval(poll, DATHOST_POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [polling, poll]);

  const [cancelState, cancelAction, isCancelling] = useActionState(
    async (_prev: ActionState) => {
      if (!confirm(t.confirmCancel)) return null;
      const result = await cancelDatHostMap(map.id);
      return {
        error: 'error' in result ? (result.error as string) : undefined,
        success: 'success' in result && result.success,
      };
    },
    null,
  );

  const statusLabel = t.mapStatus[map.dathost_status as keyof typeof t.mapStatus] || map.dathost_status;
  const statusColor = DATHOST_MAP_STATUS_COLORS[map.dathost_status || ''] || '';
  const isLive = map.dathost_status === 'LIVE';
  const team1Score = liveScore?.team1_score ?? map.team1_score;
  const team2Score = liveScore?.team2_score ?? map.team2_score;
  const roundsPlayed = liveScore?.rounds_played ?? map.rounds_played;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {isLive && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />}
          {statusLabel}
        </span>
        <span className="text-sm text-[#A1A1A1]">
          {map.map.replace('de_', '')}
        </span>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-center gap-4 py-2">
        <span className="text-sm font-medium text-[#FAFAFA]">
          {match.team1?.tag || 'T1'}
        </span>
        <span className="text-2xl font-bold text-[#FAFAFA] tabular-nums">
          {team1Score}
        </span>
        <span className="text-sm text-[#6B6B6B]">—</span>
        <span className="text-2xl font-bold text-[#FAFAFA] tabular-nums">
          {team2Score}
        </span>
        <span className="text-sm font-medium text-[#FAFAFA]">
          {match.team2?.tag || 'T2'}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
        <span>{tr.cs2.round}: {roundsPlayed}</span>
        {polling && <span>{t.polling}</span>}
      </div>

      {cancelState?.error && (
        <p className="text-sm text-red-400">{cancelState.error}</p>
      )}

      <form action={cancelAction}>
        <button
          type="submit"
          disabled={isCancelling}
          className="rounded border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#A1A1A1] hover:text-red-400 hover:border-red-400/30 disabled:opacity-50"
        >
          {isCancelling ? '...' : t.cancelMap}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finished Map Panel (import stats)
// ---------------------------------------------------------------------------

function FinishedMapPanel({ map }: { map: CS2MatchMap }) {
  const t = tr.cs2.dathost;

  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionState) => {
      const result = await importDatHostStats(map.id);
      return {
        error: 'error' in result ? (result.error as string) : undefined,
        success: 'success' in result && result.success,
        playersCount: 'playersCount' in result ? (result.playersCount as number) : undefined,
      };
    },
    null,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
          {t.mapFinished}
        </span>
        <span className="text-sm text-[#A1A1A1]">
          {map.map.replace('de_', '')} — {map.team1_score}:{map.team2_score}
        </span>
      </div>

      {state?.success ? (
        <p className="text-sm text-green-400">
          {t.importSuccess} ({state.playersCount} oyuncu)
        </p>
      ) : (
        <>
          <p className="text-xs text-[#6B6B6B]">{t.autoImportFailed}</p>
          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
          <form action={formAction}>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-[#FF4D00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50"
            >
              {isPending ? t.importing : t.importStats}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Series Controls
// ---------------------------------------------------------------------------

function SeriesControls({ match }: { match: CS2Match }) {
  const t = tr.cs2.dathost;

  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionState, formData: FormData) => {
      if (!confirm(t.confirmFinish)) return null;
      const result = await finishSeries(match.id, formData);
      return {
        error: 'error' in result ? (result.error as string) : undefined,
        success: 'success' in result && result.success,
      };
    },
    null,
  );

  return (
    <div className="border-t border-[#2A2A2A] pt-4">
      <form action={formAction} className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-[#A1A1A1] mb-1">{t.selectWinner}</label>
          <select
            name="winner_team_id"
            required
            className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA]"
          >
            <option value="">{tr.cs2.selectTeam}</option>
            {match.team1 && (
              <option value={match.team1_id}>{match.team1.tag} — {match.team1.name}</option>
            )}
            {match.team2 && (
              <option value={match.team2_id}>{match.team2.tag} — {match.team2.name}</option>
            )}
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded border border-[#2A2A2A] px-4 py-2 text-sm text-[#A1A1A1] hover:text-[#FAFAFA] hover:border-[#FAFAFA]/20 disabled:opacity-50"
        >
          {isPending ? '...' : t.finishSeries}
        </button>
      </form>

      {state?.error && typeof state.error === 'string' && (
        <p className="mt-2 text-sm text-red-400">{state.error}</p>
      )}
    </div>
  );
}
