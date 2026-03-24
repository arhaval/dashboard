'use server';

/**
 * CS2 Tournament Server Actions
 * Team, player, match management, DatHost integration
 */

import { revalidatePath } from 'next/cache';
import { cs2Service, dathostService } from '@/services';
import { userService } from '@/services';
import {
  createTeamSchema,
  createPlayerSchema,
  createMatchSchema,
  startDatHostMapSchema,
  finishSeriesSchema,
  addDatHostServerSchema,
  quickStartMatchSchema,
  startNextMapSchema,
} from '@/lib/validations/cs2';
import type { DatHostLiveScore } from '@/types';

async function requireAdmin() {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return { error: 'Yetkisiz erişim' };
  }
  return { user };
}

// ===========================================================================
// Team Actions
// ===========================================================================

export async function createTeam(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = {
    name: formData.get('name') as string,
    tag: formData.get('tag') as string,
    logo_url: (formData.get('logo_url') as string) || undefined,
  };

  const parsed = createTeamSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const team = await cs2Service.createTeam(parsed.data);
  if (!team) return { error: 'Takım oluşturulamadı' };

  revalidatePath('/matches/teams');
  return { success: true };
}

export async function updateTeam(id: string, formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = {
    name: formData.get('name') as string,
    tag: formData.get('tag') as string,
  };

  const team = await cs2Service.updateTeam(id, {
    name: raw.name,
    tag: raw.tag.toUpperCase(),
  });
  if (!team) return { error: 'Takım güncellenemedi' };

  revalidatePath('/matches/teams');
  return { success: true };
}

export async function deleteTeam(id: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const success = await cs2Service.deleteTeam(id);
  if (!success) return { error: 'Takım silinemedi' };

  revalidatePath('/matches/teams');
  return { success: true };
}

// ===========================================================================
// Player Actions
// ===========================================================================

export async function createPlayer(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = {
    team_id: formData.get('team_id') as string,
    name: formData.get('name') as string,
    steam_id: formData.get('steam_id') as string,
  };

  const parsed = createPlayerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const player = await cs2Service.createPlayer(parsed.data);
  if (!player) return { error: 'Oyuncu eklenemedi. Steam ID zaten kayıtlı olabilir.' };

  revalidatePath('/matches/teams');
  return { success: true };
}

export async function deletePlayer(id: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const success = await cs2Service.deletePlayer(id);
  if (!success) return { error: 'Oyuncu silinemedi' };

  revalidatePath('/matches/teams');
  return { success: true };
}

// ===========================================================================
// Match Actions (Series level)
// ===========================================================================

export async function createMatch(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = {
    team1_id: formData.get('team1_id') as string,
    team2_id: formData.get('team2_id') as string,
    match_date: (formData.get('match_date') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const parsed = createMatchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const match = await cs2Service.createMatch(parsed.data);
  if (!match) return { error: 'Maç oluşturulamadı' };

  revalidatePath('/matches');
  return { success: true, matchId: match.id };
}

export async function deleteMatch(id: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const success = await cs2Service.deleteMatch(id);
  if (!success) return { error: 'Maç silinemedi' };

  revalidatePath('/matches');
  return { success: true };
}

// ===========================================================================
// DatHost Integration Actions
// ===========================================================================

/** Start a DatHost map for a given series */
export async function startDatHostMap(matchId: string, formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = {
    server_id: formData.get('server_id') as string,
    map: formData.get('map') as string,
  };
  const parsed = startDatHostMapSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Load match with teams
  const match = await cs2Service.getMatchById(matchId);
  if (!match) return { error: 'Maç bulunamadı' };
  if (match.status !== 'PENDING' && match.status !== 'LIVE') {
    return { error: 'Bu serinin durumu maç başlatmaya uygun değil' };
  }

  // Get server
  const servers = await dathostService.getServers();
  const server = servers.find((s) => s.id === parsed.data.server_id);
  if (!server) return { error: 'Sunucu bulunamadı' };
  if (server.server_status !== 'IDLE') {
    return { error: 'Bu sunucu şu an maçta' };
  }

  // Gather players from both teams
  const allTeams = await cs2Service.getTeams();
  const team1 = allTeams.find((t) => t.id === match.team1_id);
  const team2 = allTeams.find((t) => t.id === match.team2_id);
  const team1Players = (team1?.players || []).filter((p) => p.is_active);
  const team2Players = (team2?.players || []).filter((p) => p.is_active);

  if (team1Players.length === 0 || team2Players.length === 0) {
    return { error: 'Her iki takımda da aktif oyuncu olmalı' };
  }

  const dathostPlayers = [
    ...team1Players.map((p) => ({ steam_id_64: p.steam_id, team: 'team1' as const })),
    ...team2Players.map((p) => ({ steam_id_64: p.steam_id, team: 'team2' as const })),
  ];

  // Call DatHost API
  const dathostMatch = await dathostService.startMatch({
    dathostServerId: server.dathost_server_id,
    map: parsed.data.map,
    team1Name: team1?.name || 'Team 1',
    team2Name: team2?.name || 'Team 2',
    players: dathostPlayers,
  });

  if (!dathostMatch) {
    return { error: 'DatHost API hatası: maç başlatılamadı' };
  }

  // Create map entry
  const mapNumber = await cs2Service.getNextMapNumber(matchId);
  const matchMap = await cs2Service.createMatchMap({
    match_id: matchId,
    map: parsed.data.map,
    map_number: mapNumber,
    team1_score: 0,
    team2_score: 0,
    rounds_played: 0,
    winner_team_id: null,
    dathost_match_id: dathostMatch.id,
    dathost_status: 'CREATED',
  });

  if (!matchMap) return { error: 'Map kaydı oluşturulamadı' };

  // Update server status
  await dathostService.updateServerStatus(server.id, 'IN_MATCH', { lastUsedAt: new Date().toISOString() });

  // Update series status if first map
  if (match.status === 'PENDING') {
    await cs2Service.updateMatch(matchId, { status: 'LIVE' });
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/matches');
  revalidatePath('/matches/operations');
  return { success: true, mapId: matchMap.id };
}

/** Poll DatHost for live scores. Also finalizes if match ended. */
export async function pollDatHostMap(
  mapId: string,
): Promise<{ error?: string; data?: DatHostLiveScore; statsImported?: boolean }> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const map = await cs2Service.getMatchMapById(mapId);
  if (!map || !map.dathost_match_id) {
    return { error: 'DatHost map bulunamadı' };
  }

  const dathostData = await dathostService.getMatch(map.dathost_match_id);
  if (!dathostData) {
    return { error: 'DatHost API yanıt vermedi' };
  }

  const liveScore: DatHostLiveScore = {
    dathost_match_id: map.dathost_match_id,
    map: dathostData.settings?.map || map.map,
    team1_score: dathostData.team1?.stats?.score || dathostData.team1_stats?.score || 0,
    team2_score: dathostData.team2?.stats?.score || dathostData.team2_stats?.score || 0,
    rounds_played: dathostData.rounds_played || 0,
    finished: dathostData.finished,
    cancelled: !!dathostData.cancel_reason,
    players: (dathostData.players || []).map((p) => ({
      steam_id: p.steam_id_64,
      team: p.team,
      kills: p.stats?.kills || 0,
      deaths: p.stats?.deaths || 0,
      assists: p.stats?.assists || 0,
    })),
  };

  // Update dathost_status based on current state
  let newStatus = map.dathost_status;
  if (dathostData.cancel_reason) {
    newStatus = 'CANCELLED';
  } else if (dathostData.finished && map.dathost_status !== 'FINISHED') {
    newStatus = 'FINISHED';
  } else if (dathostData.rounds_played > 0 && map.dathost_status !== 'LIVE' && !dathostData.finished) {
    newStatus = 'LIVE';
  }

  // If status changed, update DB
  if (newStatus !== map.dathost_status) {
    await cs2Service.updateMatchMap(map.id, { dathost_status: newStatus });
  }

  let statsImported = false;

  // If match finished, finalize scores and auto-import stats
  if (dathostData.finished && map.dathost_status !== 'FINISHED') {
    // Idempotent event log
    const eventResult = await dathostService.logEvent(
      map.dathost_match_id,
      'match_finished',
      { team1_score: liveScore.team1_score, team2_score: liveScore.team2_score },
    );

    if (eventResult && !eventResult.alreadyExists) {
      // Write final scores to DB
      const match = await cs2Service.getMatchById(map.match_id);
      let winnerId: string | null = null;
      if (liveScore.team1_score > liveScore.team2_score) winnerId = match?.team1_id || null;
      else if (liveScore.team2_score > liveScore.team1_score) winnerId = match?.team2_id || null;

      await cs2Service.updateMatchMap(map.id, {
        team1_score: liveScore.team1_score,
        team2_score: liveScore.team2_score,
        rounds_played: liveScore.rounds_played,
        winner_team_id: winnerId,
        dathost_status: 'FINISHED',
        ended_at: new Date().toISOString(),
      });

      // Check series status — auto-finish if 2-0 or 2-1
      if (match) {
        const allMaps = [...(match.maps || [])];
        // Count wins including this just-finished map
        let t1Wins = 0;
        let t2Wins = 0;
        for (const m of allMaps) {
          const mWinner = m.id === map.id ? winnerId : m.winner_team_id;
          if (mWinner === match.team1_id) t1Wins++;
          else if (mWinner === match.team2_id) t2Wins++;
        }

        const seriesOver = t1Wins >= 2 || t2Wins >= 2;
        const seriesWinner = t1Wins >= 2 ? match.team1_id : t2Wins >= 2 ? match.team2_id : null;

        // Find the server for this match
        const servers = await dathostService.getServersWithMatches();
        const usedServer = servers.find((s) => s.current_match_id === match.id);

        if (seriesOver) {
          // Finish series
          await cs2Service.updateMatch(match.id, { status: 'FINISHED', winner_team_id: seriesWinner });
          if (usedServer) {
            await dathostService.updateServerStatus(usedServer.id, 'IDLE', {
              currentMatchId: null,
              currentMapId: null,
            });
          }
        } else {
          // Series continues — clear current_map_id but keep match
          if (usedServer) {
            await dathostService.updateServerStatus(usedServer.id, 'IN_MATCH', {
              currentMapId: null,
            });
          }
        }
      }

      // Auto-import stats (best effort)
      try {
        const importResult = await importDatHostStats(map.id);
        if (importResult && 'success' in importResult && importResult.success) {
          statsImported = true;
        }
      } catch {
        console.error('Auto-import failed for map:', map.id);
      }

      await dathostService.markEventProcessed(
        map.dathost_match_id,
        'match_finished',
        statsImported ? undefined : 'Auto-import failed',
      );

      revalidatePath(`/matches/${map.match_id}`);
      revalidatePath('/matches');
      revalidatePath('/matches/operations');
    }
  }

  return { data: liveScore, statsImported };
}

/** Import player stats from a finished DatHost match */
export async function importDatHostStats(mapId: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const map = await cs2Service.getMatchMapById(mapId);
  if (!map || !map.dathost_match_id) {
    return { error: 'DatHost map bulunamadı' };
  }

  const dathostData = await dathostService.getMatch(map.dathost_match_id);
  if (!dathostData) return { error: 'DatHost API yanıt vermedi' };
  if (!dathostData.finished) return { error: 'Maç henüz bitmedi' };

  // Load match for team info
  const match = await cs2Service.getMatchById(map.match_id);
  if (!match) return { error: 'Seri bulunamadı' };

  // Index registered players by steam_id
  const allTeams = await cs2Service.getTeams();
  const allPlayers = allTeams.flatMap((t) => t.players || []);
  const playerBySteamId = new Map(allPlayers.map((p) => [p.steam_id, p]));

  const roundsPlayed = dathostData.rounds_played || 1;

  const mapPlayers = dathostData.players.map((dp) => {
    const registered = playerBySteamId.get(dp.steam_id_64);
    const teamId = dp.team === 'team1' ? match.team1_id : match.team2_id;
    const s = dp.stats;
    const adr = roundsPlayed > 0
      ? Math.round((s.damage_dealt / roundsPlayed) * 10) / 10
      : 0;

    return {
      map_id: map.id,
      player_id: registered?.id || null,
      team_id: registered?.team_id || teamId,
      steam_id: dp.steam_id_64,
      player_name: registered?.name || dp.nickname_override || dp.steam_id_64,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      damage_dealt: s.damage_dealt,
      adr,
      headshots: 0,
      mvps: 0,
      score: 0,
      entry_attempts: 0,
      entry_successes: 0,
      clutch_attempts: 0,
      clutch_wins: 0,
      kills_pistol: 0,
      kills_sniper: 0,
    };
  });

  const ok = await cs2Service.upsertMapPlayers(map.id, mapPlayers);
  if (!ok) return { error: 'İstatistikler kaydedilemedi' };

  revalidatePath(`/matches/${map.match_id}`);
  revalidatePath('/matches');
  return { success: true, playersCount: mapPlayers.length };
}

/** Cancel an active DatHost map */
export async function cancelDatHostMap(mapId: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const map = await cs2Service.getMatchMapById(mapId);
  if (!map || !map.dathost_match_id) {
    return { error: 'DatHost map bulunamadı' };
  }

  const cancelled = await dathostService.cancelMatch(map.dathost_match_id);
  if (!cancelled) return { error: 'DatHost maç iptal edilemedi' };

  await cs2Service.updateMatchMap(map.id, {
    dathost_status: 'CANCELLED',
    ended_at: new Date().toISOString(),
  });

  // Release server
  const servers = await dathostService.getServers();
  const usedServer = servers.find((s) => s.server_status === 'IN_MATCH');
  if (usedServer) {
    await dathostService.updateServerStatus(usedServer.id, 'IDLE');
  }

  revalidatePath(`/matches/${map.match_id}`);
  revalidatePath('/matches');
  revalidatePath('/matches/operations');
  return { success: true };
}

/** Cancel entire series — cancel active DatHost map, release server, mark CANCELLED */
export async function cancelSeries(matchId: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const match = await cs2Service.getMatchById(matchId);
  if (!match) return { error: 'Maç bulunamadı' };

  // Cancel any active DatHost maps
  const maps = match.maps || [];
  for (const map of maps) {
    if (
      map.dathost_match_id &&
      (map.dathost_status === 'CREATED' ||
        map.dathost_status === 'WAITING_PLAYERS' ||
        map.dathost_status === 'LIVE')
    ) {
      await dathostService.cancelMatch(map.dathost_match_id).catch(() => {});
      await cs2Service.updateMatchMap(map.id, {
        dathost_status: 'CANCELLED',
        ended_at: new Date().toISOString(),
      });
    }
  }

  // Release server
  const servers = await dathostService.getServers();
  const usedServer = servers.find(
    (s) => s.current_match_id === matchId && s.server_status === 'IN_MATCH',
  );
  if (usedServer) {
    await dathostService.updateServerStatus(usedServer.id, 'IDLE');
  }

  await cs2Service.updateMatch(matchId, { status: 'CANCELLED' });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/matches');
  revalidatePath('/matches/operations');
  return { success: true };
}

/** Finish a series (BO3) — set winner and status */
export async function finishSeries(matchId: string, formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = { winner_team_id: formData.get('winner_team_id') as string };
  const parsed = finishSeriesSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const match = await cs2Service.getMatchById(matchId);
  if (!match) return { error: 'Maç bulunamadı' };

  await cs2Service.updateMatch(matchId, {
    status: 'FINISHED',
    winner_team_id: parsed.data.winner_team_id,
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/matches');
  revalidatePath('/matches/operations');
  return { success: true };
}

// ===========================================================================
// DatHost Server Management
// ===========================================================================

export async function addDatHostServer(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = {
    dathost_server_id: formData.get('dathost_server_id') as string,
    name: formData.get('name') as string,
  };
  const parsed = addDatHostServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const server = await dathostService.createServer(parsed.data);
  if (!server) return { error: 'Sunucu eklenemedi (ID zaten mevcut olabilir)' };

  revalidatePath('/matches/operations');
  return { success: true };
}

export async function removeDatHostServer(id: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const ok = await dathostService.deleteServer(id);
  if (!ok) return { error: 'Sunucu silinemedi' };

  revalidatePath('/matches/operations');
  return { success: true };
}

// ===========================================================================
// Quick Start Match — single action: create match + start DatHost map
// ===========================================================================

export async function quickStartMatch(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = {
    server_id: formData.get('server_id') as string,
    team1_id: formData.get('team1_id') as string,
    team2_id: formData.get('team2_id') as string,
    map: formData.get('map') as string,
  };

  const parsed = quickStartMatchSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { server_id, team1_id, team2_id, map } = parsed.data;

  // Get server, must be IDLE
  const servers = await dathostService.getServers();
  const server = servers.find((s) => s.id === server_id);
  if (!server) return { error: `Sunucu bulunamadı (id: ${server_id}, servers: ${servers.length})` };
  if (server.server_status !== 'IDLE') return { error: `Sunucu meşgul (status: ${server.server_status})` };

  // Get teams with players
  const allTeams = await cs2Service.getTeams();
  const team1 = allTeams.find((t) => t.id === team1_id);
  const team2 = allTeams.find((t) => t.id === team2_id);
  if (!team1 || !team2) return { error: `Takım bulunamadı (team1: ${!!team1}, team2: ${!!team2}, total: ${allTeams.length})` };

  const team1Players = (team1.players || []).filter((p) => p.is_active);
  const team2Players = (team2.players || []).filter((p) => p.is_active);
  if (team1Players.length === 0 || team2Players.length === 0) {
    return { error: `Aktif oyuncu yok (${team1.name}: ${team1Players.length}, ${team2.name}: ${team2Players.length})` };
  }

  // Create match (series)
  const match = await cs2Service.createMatch({
    team1_id,
    team2_id,
    match_date: new Date().toISOString(),
  });
  if (!match) return { error: 'Maç oluşturulamadı (DB hatası)' };

  // Update match status to LIVE
  await cs2Service.updateMatch(match.id, { status: 'LIVE' });

  // Build player list for DatHost API
  const players = [
    ...team1Players.map((p) => ({ steam_id_64: p.steam_id, team: 'team1' as const })),
    ...team2Players.map((p) => ({ steam_id_64: p.steam_id, team: 'team2' as const })),
  ];

  // Start match on DatHost
  const dathostMatch = await dathostService.startMatch({
    dathostServerId: server.dathost_server_id,
    map,
    team1Name: team1.name,
    team2Name: team2.name,
    players,
  });

  if (!dathostMatch) {
    // Rollback: delete the match we just created
    await cs2Service.deleteMatch(match.id);
    const apiErr = dathostService.getLastError();
    return { error: `DatHost API: ${apiErr || 'bilinmeyen hata'} (server: ${server.dathost_server_id}, players: ${players.length})` };
  }

  // Create map entry
  const matchMap = await cs2Service.createMatchMap({
    match_id: match.id,
    map,
    map_number: 1,
    team1_score: 0,
    team2_score: 0,
    rounds_played: 0,
    winner_team_id: null,
    dathost_match_id: dathostMatch.id,
    dathost_status: 'CREATED',
  });

  if (!matchMap) return { error: 'Map kaydı oluşturulamadı' };

  // Update server tracking
  await dathostService.updateServerStatus(server.id, 'IN_MATCH', {
    lastUsedAt: new Date().toISOString(),
    currentMatchId: match.id,
    currentMapId: matchMap.id,
  });

  revalidatePath('/matches/operations');
  revalidatePath('/matches');

  return { success: true, matchId: match.id, mapId: matchMap.id };
}

// ===========================================================================
// Start Next Map — start the next map in an ongoing series (by server ID)
// ===========================================================================

export async function startNextMap(serverId: string, formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = { map: formData.get('map') as string };
  const parsed = startNextMapSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Get server with current match
  const servers = await dathostService.getServersWithMatches();
  const server = servers.find((s) => s.id === serverId);
  if (!server) return { error: 'Sunucu bulunamadı' };
  if (!server.current_match_id) return { error: 'Sunucuda aktif seri yok' };

  const match = await cs2Service.getMatchById(server.current_match_id);
  if (!match) return { error: 'Maç bulunamadı' };
  if (match.status !== 'LIVE') return { error: 'Seri aktif değil' };

  // All previous maps must be finished
  const activeMaps = (match.maps || []).filter(
    (m) => m.dathost_status && !['FINISHED', 'CANCELLED', 'FAILED'].includes(m.dathost_status)
  );
  if (activeMaps.length > 0) return { error: 'Aktif bir map var, önce bitmesini bekleyin' };

  // Get teams with players
  const allTeams = await cs2Service.getTeams();
  const team1 = allTeams.find((t) => t.id === match.team1_id);
  const team2 = allTeams.find((t) => t.id === match.team2_id);
  if (!team1 || !team2) return { error: 'Takım bulunamadı' };

  const players = [
    ...(team1.players || []).filter((p) => p.is_active).map((p) => ({ steam_id_64: p.steam_id, team: 'team1' as const })),
    ...(team2.players || []).filter((p) => p.is_active).map((p) => ({ steam_id_64: p.steam_id, team: 'team2' as const })),
  ];

  const dathostMatch = await dathostService.startMatch({
    dathostServerId: server.dathost_server_id,
    map: parsed.data.map,
    team1Name: team1.name,
    team2Name: team2.name,
    players,
  });

  if (!dathostMatch) return { error: 'DatHost API hatası' };

  const mapNumber = await cs2Service.getNextMapNumber(match.id);
  const matchMap = await cs2Service.createMatchMap({
    match_id: match.id,
    map: parsed.data.map,
    map_number: mapNumber,
    team1_score: 0,
    team2_score: 0,
    rounds_played: 0,
    winner_team_id: null,
    dathost_match_id: dathostMatch.id,
    dathost_status: 'CREATED',
  });

  if (!matchMap) return { error: 'Map kaydı oluşturulamadı' };

  await dathostService.updateServerStatus(server.id, 'IN_MATCH', {
    lastUsedAt: new Date().toISOString(),
    currentMapId: matchMap.id,
  });

  revalidatePath('/matches/operations');
  return { success: true, mapId: matchMap.id };
}

// ===========================================================================
// Start Next Map for Match — start next map by match ID (for match detail page)
// ===========================================================================

export async function startNextMapForMatch(matchId: string, formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const raw = { map: formData.get('map') as string };
  const parsed = startNextMapSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Find the server assigned to this match
  const servers = await dathostService.getServersWithMatches();
  const server = servers.find((s) => s.current_match_id === matchId);
  if (!server) return { error: 'Bu maça atanmış sunucu bulunamadı' };

  const match = await cs2Service.getMatchById(matchId);
  if (!match) return { error: 'Maç bulunamadı' };
  if (match.status !== 'LIVE') return { error: 'Seri aktif değil' };

  // All previous maps must be finished
  const activeMaps = (match.maps || []).filter(
    (m) => m.dathost_status && !['FINISHED', 'CANCELLED', 'FAILED'].includes(m.dathost_status)
  );
  if (activeMaps.length > 0) return { error: 'Aktif bir map var, önce bitmesini bekleyin' };

  // Get teams with players
  const allTeams = await cs2Service.getTeams();
  const team1 = allTeams.find((t) => t.id === match.team1_id);
  const team2 = allTeams.find((t) => t.id === match.team2_id);
  if (!team1 || !team2) return { error: 'Takım bulunamadı' };

  const players = [
    ...(team1.players || []).filter((p) => p.is_active).map((p) => ({ steam_id_64: p.steam_id, team: 'team1' as const })),
    ...(team2.players || []).filter((p) => p.is_active).map((p) => ({ steam_id_64: p.steam_id, team: 'team2' as const })),
  ];

  const dathostMatch = await dathostService.startMatch({
    dathostServerId: server.dathost_server_id,
    map: parsed.data.map,
    team1Name: team1.name,
    team2Name: team2.name,
    players,
  });

  if (!dathostMatch) return { error: 'DatHost API hatası' };

  const mapNumber = await cs2Service.getNextMapNumber(match.id);
  const matchMap = await cs2Service.createMatchMap({
    match_id: match.id,
    map: parsed.data.map,
    map_number: mapNumber,
    team1_score: 0,
    team2_score: 0,
    rounds_played: 0,
    winner_team_id: null,
    dathost_match_id: dathostMatch.id,
    dathost_status: 'CREATED',
  });

  if (!matchMap) return { error: 'Map kaydı oluşturulamadı' };

  await dathostService.updateServerStatus(server.id, 'IN_MATCH', {
    lastUsedAt: new Date().toISOString(),
    currentMapId: matchMap.id,
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/matches/operations');
  return { success: true, mapId: matchMap.id };
}

// ===========================================================================
// Reset Server — finish the series and release the server
// ===========================================================================

export async function resetServer(serverId: string) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const servers = await dathostService.getServersWithMatches();
  const server = servers.find((s) => s.id === serverId);
  if (!server) return { error: 'Sunucu bulunamadı' };

  if (server.current_match_id && server.current_match) {
    const match = server.current_match;
    const maps = match.maps || [];

    // Calculate winner from finished maps
    let team1Wins = 0;
    let team2Wins = 0;
    for (const m of maps) {
      if (m.winner_team_id === match.team1_id) team1Wins++;
      else if (m.winner_team_id === match.team2_id) team2Wins++;
    }

    const winnerId = team1Wins > team2Wins ? match.team1_id : team2Wins > team1Wins ? match.team2_id : null;
    await cs2Service.updateMatch(match.id, {
      status: 'FINISHED',
      winner_team_id: winnerId,
    });
  }

  await dathostService.updateServerStatus(server.id, 'IDLE', {
    currentMatchId: null,
    currentMapId: null,
  });

  revalidatePath('/matches/operations');
  revalidatePath('/matches');
  return { success: true };
}
