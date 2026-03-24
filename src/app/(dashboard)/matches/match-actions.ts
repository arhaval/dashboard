'use server';

/**
 * CS2 Tournament Server Actions
 * Team, player, match management, and CSV upload per map
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
// CSV Upload — Creates a map entry + player stats within a match
// ===========================================================================

const COLUMN_MAP: Record<string, string> = {
  // Player identification
  player: 'player_name', name: 'player_name', nick: 'player_name', nickname: 'player_name',
  oyuncu: 'player_name', 'player name': 'player_name', 'player_name': 'player_name',
  nickname_override: 'player_name',
  // Steam ID
  steamid: 'steam_id', steam_id: 'steam_id', steamid64: 'steam_id', 'steam id': 'steam_id',
  steam_id_64: 'steam_id', 'steam id 64': 'steam_id',
  // Team (dathost: "team_Muzaffer" etc.)
  team: 'csv_team',
  // Core stats
  k: 'kills', kills: 'kills',
  d: 'deaths', deaths: 'deaths',
  a: 'assists', assists: 'assists',
  // Headshots — dathost uses head_shot_kills
  hs: 'headshots', headshots: 'headshots', kills_with_headshot: 'headshots',
  head_shot_kills: 'headshots',
  adr: 'adr',
  mvp: 'mvps', mvps: 'mvps',
  score: 'score', skor: 'score',
  // Damage
  damage: 'damage_dealt', dmg: 'damage_dealt', hasar: 'damage_dealt',
  damage_dealt: 'damage_dealt',
  // Entry — dathost uses entry_count / entry_wins
  entry_successes: 'entry_successes', entry_attempts: 'entry_attempts',
  entry_count: 'entry_attempts', entry_wins: 'entry_successes',
  // Clutch — dathost uses v1_count / v1_wins
  clutch_wins: 'clutch_wins', clutch_attempts: 'clutch_attempts',
  '1vx_attempts': 'clutch_attempts', '1vx_wins': 'clutch_wins',
  v1_count: 'clutch_attempts', v1_wins: 'clutch_wins',
  // Weapon kills
  kills_pistol: 'kills_pistol', kills_with_pistol: 'kills_pistol',
  kills_sniper: 'kills_sniper', kills_with_sniper: 'kills_sniper',
};

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;\t]/).map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const mappedKey = COLUMN_MAP[h] || h;
      row[mappedKey] = values[idx] || '';
    });
    if (row.player_name) rows.push(row);
  }

  return rows;
}

export async function uploadMapCSV(matchId: string, formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  // 1. Validate inputs
  const mapName = formData.get('map') as string;
  const team1Score = parseInt(formData.get('team1_score') as string, 10);
  const team2Score = parseInt(formData.get('team2_score') as string, 10);

  if (!mapName) return { error: 'Harita seçin' };
  if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
    return { error: 'Geçersiz skor değeri' };
  }

  // 2. Get CSV content
  const csvFile = formData.get('csv_file') as File | null;
  if (!csvFile || csvFile.size === 0) {
    return { error: 'CSV dosyası seçilmedi' };
  }

  const csvText = await csvFile.text();
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    return { error: 'CSV dosyasında oyuncu verisi bulunamadı' };
  }

  // 3. Get match details
  const match = await cs2Service.getMatchById(matchId);
  if (!match) return { error: 'Maç bulunamadı' };

  // 4. Get players from both teams — index by steam_id AND name
  const allTeams = await cs2Service.getTeams();
  const team1 = allTeams.find((t) => t.id === match.team1_id);
  const team2 = allTeams.find((t) => t.id === match.team2_id);
  const allPlayers = [...(team1?.players || []), ...(team2?.players || [])];

  const playerBySteamId = new Map(
    allPlayers.map((p) => [p.steam_id, p])
  );
  const playerByName = new Map(
    allPlayers.map((p) => [p.name.toLowerCase(), p])
  );

  // Build dathost csv_team → team_id mapping
  // Dathost uses "team_XXX" format. We match by finding registered players
  // in each csv_team group and using their team_id.
  const csvTeamToId = new Map<string, string>();
  for (const row of rows) {
    const csvTeam = (row.csv_team || '').trim();
    if (!csvTeam || csvTeamToId.has(csvTeam)) continue;
    const csvSid = (row.steam_id || '').trim();
    const reg = csvSid ? playerBySteamId.get(csvSid) : undefined;
    if (reg) {
      csvTeamToId.set(csvTeam, reg.team_id);
    }
  }

  // 5. Determine map winner and next map number
  const roundsPlayed = team1Score + team2Score;
  let mapWinner: string | null = null;
  if (team1Score > team2Score) mapWinner = match.team1_id;
  else if (team2Score > team1Score) mapWinner = match.team2_id;

  const mapNumber = await cs2Service.getNextMapNumber(matchId);

  // 6. Create map entry
  const matchMap = await cs2Service.createMatchMap({
    match_id: matchId,
    map: mapName,
    map_number: mapNumber,
    team1_score: team1Score,
    team2_score: team2Score,
    rounds_played: roundsPlayed,
    winner_team_id: mapWinner,
  });
  if (!matchMap) return { error: 'Map kaydı oluşturulamadı' };

  // 7. Map CSV rows to player stats
  // Priority: match by steam_id first, then fall back to name
  const mapPlayers = rows.map((row) => {
    const csvSteamId = (row.steam_id || '').trim();
    let registered = csvSteamId
      ? playerBySteamId.get(csvSteamId)
      : undefined;

    // Fallback: try matching by name if no steam_id in CSV or no match found
    if (!registered && row.player_name) {
      registered = playerByName.get(row.player_name.toLowerCase());
    }

    // Determine team: registered player's team > csv_team mapping > fallback to team2
    const csvTeam = (row.csv_team || '').trim();
    const teamId = registered?.team_id
      || (csvTeam ? csvTeamToId.get(csvTeam) : undefined)
      || match.team2_id;

    const kills = parseInt(row.kills || '0', 10) || 0;
    const deaths = parseInt(row.deaths || '0', 10) || 0;
    const assists = parseInt(row.assists || '0', 10) || 0;
    const headshots = parseInt(row.headshots || '0', 10) || 0;
    const mvps = parseInt(row.mvps || '0', 10) || 0;
    const score = parseInt(row.score || '0', 10) || 0;
    const damage_dealt = parseInt(row.damage_dealt || '0', 10) || 0;
    const entry_attempts = parseInt(row.entry_attempts || '0', 10) || 0;
    const entry_successes = parseInt(row.entry_successes || '0', 10) || 0;
    const clutch_attempts = parseInt(row.clutch_attempts || '0', 10) || 0;
    const clutch_wins = parseInt(row.clutch_wins || '0', 10) || 0;
    const kills_pistol = parseInt(row.kills_pistol || '0', 10) || 0;
    const kills_sniper = parseInt(row.kills_sniper || '0', 10) || 0;

    let adr = parseFloat(row.adr || '0') || 0;
    if (adr === 0 && damage_dealt > 0 && roundsPlayed > 0) {
      adr = Math.round((damage_dealt / roundsPlayed) * 10) / 10;
    }

    // Use registered player's steam_id and name if found,
    // otherwise use CSV values as-is
    return {
      map_id: matchMap.id,
      player_id: registered?.id || null,
      team_id: teamId,
      steam_id: registered?.steam_id || csvSteamId || row.player_name,
      player_name: registered?.name || row.player_name,
      kills, deaths, assists, headshots, mvps, score,
      damage_dealt, entry_attempts, entry_successes,
      clutch_attempts, clutch_wins, kills_pistol, kills_sniper,
      adr,
    };
  });

  // 8. Upsert player stats
  const statsOk = await cs2Service.upsertMapPlayers(matchMap.id, mapPlayers);
  if (!statsOk) return { error: 'Oyuncu istatistikleri kaydedilemedi' };

  // 9. Update match status
  if (match.status === 'PENDING') {
    await cs2Service.updateMatch(matchId, { status: 'LIVE' });
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/matches');
  return { success: true, playersCount: mapPlayers.length, mapNumber };
}

// ===========================================================================
// Auto-Import from CSV (creates teams + players + match + stats automatically)
// ===========================================================================

/** Import CSV and auto-create everything: teams, players, match, map, stats */
export async function importFromCSV(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const mapName = formData.get('map') as string;
  const team1Score = parseInt(formData.get('team1_score') as string, 10);
  const team2Score = parseInt(formData.get('team2_score') as string, 10);
  const team1Name = (formData.get('team1_name') as string) || '';
  const team2Name = (formData.get('team2_name') as string) || '';
  const matchId = (formData.get('match_id') as string) || ''; // optional — append to existing match

  if (!mapName) return { error: 'Harita seçin' };
  if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
    return { error: 'Geçersiz skor değeri' };
  }

  // Get CSV content (either from file upload or from server fetch)
  let csvText = formData.get('csv_text') as string | null;
  if (!csvText) {
    const csvFile = formData.get('csv_file') as File | null;
    if (!csvFile || csvFile.size === 0) {
      return { error: 'CSV dosyası seçilmedi' };
    }
    csvText = await csvFile.text();
  }

  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return { error: 'CSV dosyasında oyuncu verisi bulunamadı' };
  }

  // Group players by csv_team column
  const teamGroups = new Map<string, typeof rows>();
  for (const row of rows) {
    const csvTeam = (row.csv_team || 'unknown').trim();
    if (!teamGroups.has(csvTeam)) teamGroups.set(csvTeam, []);
    teamGroups.get(csvTeam)!.push(row);
  }

  // We expect exactly 2 teams
  const teamKeys = Array.from(teamGroups.keys());
  if (teamKeys.length < 2) {
    return { error: 'CSV dosyasında en az 2 takım bulunamadı. "team" sütunu kontrol edin.' };
  }

  // Determine team names: user-provided > csv team column value
  const cleanTeamName = (csvKey: string) =>
    csvKey.replace(/^team_/i, '').trim() || csvKey;

  const t1Name = team1Name || cleanTeamName(teamKeys[0]);
  const t2Name = team2Name || cleanTeamName(teamKeys[1]);

  // Auto-create teams
  const team1 = await cs2Service.findOrCreateTeam(t1Name);
  const team2 = await cs2Service.findOrCreateTeam(t2Name);
  if (!team1 || !team2) return { error: 'Takımlar oluşturulamadı' };

  // Auto-create players for each team
  const team1Rows = teamGroups.get(teamKeys[0]) || [];
  const team2Rows = teamGroups.get(teamKeys[1]) || [];

  for (const row of team1Rows) {
    const steamId = (row.steam_id || '').trim();
    const name = (row.player_name || steamId || 'Unknown').trim();
    if (steamId) await cs2Service.findOrCreatePlayer(steamId, name, team1.id);
  }
  for (const row of team2Rows) {
    const steamId = (row.steam_id || '').trim();
    const name = (row.player_name || steamId || 'Unknown').trim();
    if (steamId) await cs2Service.findOrCreatePlayer(steamId, name, team2.id);
  }

  // Get or create match
  let match;
  if (matchId) {
    match = await cs2Service.getMatchById(matchId);
    if (!match) return { error: 'Maç bulunamadı' };
  } else {
    match = await cs2Service.createMatch({
      team1_id: team1.id,
      team2_id: team2.id,
      match_date: new Date().toISOString(),
    });
    if (!match) return { error: 'Maç oluşturulamadı' };
  }

  // Create map entry
  const roundsPlayed = team1Score + team2Score;
  let mapWinner: string | null = null;
  if (team1Score > team2Score) mapWinner = team1.id;
  else if (team2Score > team1Score) mapWinner = team2.id;

  const mapNumber = await cs2Service.getNextMapNumber(match.id);
  const matchMap = await cs2Service.createMatchMap({
    match_id: match.id,
    map: mapName,
    map_number: mapNumber,
    team1_score: team1Score,
    team2_score: team2Score,
    rounds_played: roundsPlayed,
    winner_team_id: mapWinner,
  });
  if (!matchMap) return { error: 'Map kaydı oluşturulamadı' };

  // Build player lookup (refreshed after auto-create)
  const allPlayers = [
    ...(await cs2Service.getPlayersByTeam(team1.id)),
    ...(await cs2Service.getPlayersByTeam(team2.id)),
  ];
  const playerBySteamId = new Map(allPlayers.map((p) => [p.steam_id, p]));

  // Map CSV rows to player stats
  const mapPlayers = rows.map((row) => {
    const csvSteamId = (row.steam_id || '').trim();
    const csvTeam = (row.csv_team || '').trim();
    const registered = csvSteamId ? playerBySteamId.get(csvSteamId) : undefined;
    const teamId = csvTeam === teamKeys[0] ? team1.id : team2.id;

    const kills = parseInt(row.kills || '0', 10) || 0;
    const deaths = parseInt(row.deaths || '0', 10) || 0;
    const assists = parseInt(row.assists || '0', 10) || 0;
    const headshots = parseInt(row.headshots || '0', 10) || 0;
    const mvps = parseInt(row.mvps || '0', 10) || 0;
    const score = parseInt(row.score || '0', 10) || 0;
    const damage_dealt = parseInt(row.damage_dealt || '0', 10) || 0;
    const entry_attempts = parseInt(row.entry_attempts || '0', 10) || 0;
    const entry_successes = parseInt(row.entry_successes || '0', 10) || 0;
    const clutch_attempts = parseInt(row.clutch_attempts || '0', 10) || 0;
    const clutch_wins = parseInt(row.clutch_wins || '0', 10) || 0;
    const kills_pistol = parseInt(row.kills_pistol || '0', 10) || 0;
    const kills_sniper = parseInt(row.kills_sniper || '0', 10) || 0;

    let adr = parseFloat(row.adr || '0') || 0;
    if (adr === 0 && damage_dealt > 0 && roundsPlayed > 0) {
      adr = Math.round((damage_dealt / roundsPlayed) * 10) / 10;
    }

    return {
      map_id: matchMap.id,
      player_id: registered?.id || null,
      team_id: teamId,
      steam_id: registered?.steam_id || csvSteamId || row.player_name,
      player_name: registered?.name || row.player_name,
      kills, deaths, assists, headshots, mvps, score,
      damage_dealt, entry_attempts, entry_successes,
      clutch_attempts, clutch_wins, kills_pistol, kills_sniper,
      adr,
    };
  });

  const statsOk = await cs2Service.upsertMapPlayers(matchMap.id, mapPlayers);
  if (!statsOk) return { error: 'Oyuncu istatistikleri kaydedilemedi' };

  if (match.status === 'PENDING') {
    await cs2Service.updateMatch(match.id, { status: 'LIVE' });
  }

  revalidatePath(`/matches/${match.id}`);
  revalidatePath('/matches');
  revalidatePath('/matches/teams');
  return {
    success: true,
    matchId: match.id,
    team1Name: t1Name,
    team2Name: t2Name,
    playersCount: mapPlayers.length,
    mapNumber,
  };
}

/** Scan DatHost server — reads MatchZy SQLite for match data + CSV paths */
export async function scanServerCSVs(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const dathostServerId = formData.get('dathost_server_id') as string;
  if (!dathostServerId) return { error: 'Sunucu ID gerekli' };

  // Try to read MatchZy SQLite database for full match info
  const dbMatches = await dathostService.readMatchZyDatabase(dathostServerId);

  // Also scan for CSV files
  const csvFiles = await dathostService.scanMatchZyStats(dathostServerId);

  if (dbMatches.length === 0 && csvFiles.length === 0) {
    return { error: 'Sunucuda MatchZy maç verisi bulunamadı' };
  }

  // Merge: match CSV paths with SQLite match data
  const merged = dbMatches.map((m) => {
    const csv = csvFiles.find((c) => c.matchId === m.matchId);
    return {
      ...m,
      csvPath: csv?.csvPath || null,
      csvName: csv?.csvName || null,
    };
  });

  // Add any CSV-only entries (no SQLite data)
  for (const csv of csvFiles) {
    if (!merged.some((m) => m.matchId === csv.matchId)) {
      merged.push({
        matchId: csv.matchId,
        mapNumber: 0,
        team1Name: 'Takım 1',
        team1Score: 0,
        team2Name: 'Takım 2',
        team2Score: 0,
        mapName: '',
        csvPath: csv.csvPath,
        csvName: csv.csvName,
      });
    }
  }

  return { success: true, matches: merged };
}

/** Fetch a specific CSV from DatHost server and return its content */
export async function fetchServerCSV(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const dathostServerId = formData.get('dathost_server_id') as string;
  const csvPath = formData.get('csv_path') as string;
  if (!dathostServerId || !csvPath) return { error: 'Eksik parametre' };

  const csvText = await dathostService.downloadServerFile(dathostServerId, csvPath);
  if (!csvText) return { error: 'CSV dosyası indirilemedi' };

  return { success: true, csvText };
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
    team1_score: dathostData.team1_stats?.score || 0,
    team2_score: dathostData.team2_stats?.score || 0,
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
// DatHost Quick Import — Tek match ID ile her şeyi çek
// ===========================================================================

/**
 * Import a complete match from DatHost using only the match ID.
 * Auto-creates teams, players, match (series), map, and player stats.
 *
 * If a series matchId is provided, appends as a new map to that series.
 * Otherwise, creates a new series.
 */
export async function importFromDathost(formData: FormData) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const dathostMatchId = (formData.get('dathost_match_id') as string || '').trim();
  const existingMatchId = (formData.get('match_id') as string || '').trim() || null;

  if (!dathostMatchId) {
    return { error: 'DatHost Match ID gerekli' };
  }

  // 1. Fetch match data from DatHost API
  const dathostData = await dathostService.getMatch(dathostMatchId);
  if (!dathostData) {
    return { error: 'DatHost API yanıt vermedi. Match ID\'yi kontrol edin.' };
  }

  // 2. Separate players by team
  const team1Players = dathostData.players.filter((p) => p.team === 'team1');
  const team2Players = dathostData.players.filter((p) => p.team === 'team2');

  // 3. Find or create teams
  const team1Name = dathostData.settings?.team1_name || 'Team 1';
  const team2Name = dathostData.settings?.team2_name || 'Team 2';

  const team1 = await cs2Service.findOrCreateTeam(team1Name);
  const team2 = await cs2Service.findOrCreateTeam(team2Name);
  if (!team1 || !team2) {
    return { error: 'Takımlar oluşturulamadı' };
  }

  // 4. Find or create players
  for (const dp of team1Players) {
    const name = dp.nickname_override || dp.steam_id_64;
    await cs2Service.findOrCreatePlayer(dp.steam_id_64, name, team1.id);
  }
  for (const dp of team2Players) {
    const name = dp.nickname_override || dp.steam_id_64;
    await cs2Service.findOrCreatePlayer(dp.steam_id_64, name, team2.id);
  }

  // 5. Get or create match (series)
  let matchId = existingMatchId;
  if (!matchId) {
    const match = await cs2Service.createMatch({
      team1_id: team1.id,
      team2_id: team2.id,
    });
    if (!match) return { error: 'Maç oluşturulamadı' };
    matchId = match.id;
  }

  // 6. Create map entry
  const team1Score = dathostData.team1_stats?.score || 0;
  const team2Score = dathostData.team2_stats?.score || 0;
  const roundsPlayed = dathostData.rounds_played || 0;
  const mapName = dathostData.settings?.map || 'unknown';

  let winnerId: string | null = null;
  if (team1Score > team2Score) winnerId = team1.id;
  else if (team2Score > team1Score) winnerId = team2.id;

  const mapNumber = await cs2Service.getNextMapNumber(matchId);

  const matchMap = await cs2Service.createMatchMap({
    match_id: matchId,
    map: mapName,
    map_number: mapNumber,
    team1_score: team1Score,
    team2_score: team2Score,
    rounds_played: roundsPlayed,
    winner_team_id: winnerId,
    dathost_match_id: dathostMatchId,
    dathost_status: dathostData.finished ? 'FINISHED' : 'LIVE',
  });

  if (!matchMap) return { error: 'Map kaydı oluşturulamadı' };

  // 7. Import player stats (if match is finished)
  let playersCount = 0;
  if (dathostData.finished) {
    const allRegisteredPlayers = await cs2Service.getTeams();
    const playerBySteamId = new Map(
      allRegisteredPlayers.flatMap((t) => (t.players || []).map((p) => [p.steam_id, p])),
    );

    const mapPlayers = dathostData.players.map((dp) => {
      const registered = playerBySteamId.get(dp.steam_id_64);
      const teamId = dp.team === 'team1' ? team1.id : team2.id;
      const s = dp.stats;
      const adr = roundsPlayed > 0
        ? Math.round((s.damage_dealt / roundsPlayed) * 10) / 10
        : 0;

      return {
        map_id: matchMap.id,
        player_id: registered?.id || null,
        team_id: registered?.team_id || teamId,
        steam_id: dp.steam_id_64,
        player_name: registered?.name || dp.nickname_override || dp.steam_id_64,
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        headshots: s.kills_with_headshot,
        mvps: s.mvps,
        score: s.score,
        damage_dealt: s.damage_dealt,
        entry_attempts: s.entry_attempts,
        entry_successes: s.entry_successes,
        clutch_attempts: s['1vX_attempts'],
        clutch_wins: s['1vX_wins'],
        kills_pistol: s.kills_with_pistol,
        kills_sniper: s.kills_with_sniper,
        adr,
      };
    });

    const ok = await cs2Service.upsertMapPlayers(matchMap.id, mapPlayers);
    if (!ok) return { error: 'İstatistikler kaydedilemedi' };
    playersCount = mapPlayers.length;
  }

  // 8. Update match status
  const match = await cs2Service.getMatchById(matchId);
  if (match && match.status === 'PENDING') {
    await cs2Service.updateMatch(matchId, { status: dathostData.finished ? 'LIVE' : 'LIVE' });
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/matches');
  revalidatePath('/matches/operations');

  return {
    success: true,
    matchId,
    mapNumber,
    playersCount,
    team1Name: team1.name,
    team2Name: team2.name,
    score: `${team1Score}:${team2Score}`,
    map: mapName,
  };
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
// Start Next Map — start the next map in an ongoing series
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
