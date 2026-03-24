/**
 * CS2 Tournament Service
 * Teams, players, matches (series), match maps, and player statistics
 */

import { createClient } from '@/lib/supabase/server';
import type {
  CS2Team,
  CS2Player,
  CS2Match,
  CS2MatchMap,
  CS2MatchPlayer,
  CS2MatchFilters,
  CS2PlayerLeaderboardEntry,
  CreateCS2TeamInput,
  CreateCS2PlayerInput,
  CreateCS2MatchInput,
} from '@/types';

export const cs2Service = {
  // ===========================================================================
  // Teams
  // ===========================================================================

  async getTeams(): Promise<CS2Team[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_teams')
      .select('*, players:cs2_players(*)')
      .order('name');

    if (error) {
      console.error('Error fetching CS2 teams:', error);
      return [];
    }
    return data || [];
  },

  async getTeamById(id: string): Promise<CS2Team | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_teams')
      .select('*, players:cs2_players(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching CS2 team:', error);
      return null;
    }
    return data;
  },

  async createTeam(input: CreateCS2TeamInput): Promise<CS2Team | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_teams')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating CS2 team:', error);
      return null;
    }
    return data;
  },

  async updateTeam(id: string, input: Partial<CreateCS2TeamInput>): Promise<CS2Team | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_teams')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating CS2 team:', error);
      return null;
    }
    return data;
  },

  async deleteTeam(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from('cs2_teams').delete().eq('id', id);

    if (error) {
      console.error('Error deleting CS2 team:', error);
      return false;
    }
    return true;
  },

  // ===========================================================================
  // Players
  // ===========================================================================

  async getPlayersByTeam(teamId: string): Promise<CS2Player[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_players')
      .select('*')
      .eq('team_id', teamId)
      .order('name');

    if (error) {
      console.error('Error fetching CS2 players:', error);
      return [];
    }
    return data || [];
  },

  async createPlayer(input: CreateCS2PlayerInput): Promise<CS2Player | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_players')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating CS2 player:', error);
      return null;
    }
    return data;
  },

  async updatePlayer(
    id: string,
    input: Partial<Pick<CS2Player, 'name' | 'steam_id' | 'is_active'>>
  ): Promise<CS2Player | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_players')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating CS2 player:', error);
      return null;
    }
    return data;
  },

  async deletePlayer(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from('cs2_players').delete().eq('id', id);

    if (error) {
      console.error('Error deleting CS2 player:', error);
      return false;
    }
    return true;
  },

  /** Find a player by steam_id, or return null */
  async findPlayerBySteamId(steamId: string): Promise<CS2Player | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_players')
      .select('*, team:cs2_teams(*)')
      .eq('steam_id', steamId)
      .single();

    if (error) return null;
    return data;
  },

  /** Find team by name, or create it with an auto-generated tag */
  async findOrCreateTeam(name: string): Promise<CS2Team | null> {
    const supabase = await createClient();

    // Try to find existing
    const { data: existing } = await supabase
      .from('cs2_teams')
      .select('*, players:cs2_players(*)')
      .eq('name', name)
      .single();

    if (existing) return existing;

    // Create with auto tag (first 5 chars uppercase)
    const tag = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'TEAM';
    const { data, error } = await supabase
      .from('cs2_teams')
      .insert({ name, tag })
      .select('*, players:cs2_players(*)')
      .single();

    if (error) {
      console.error('Error creating CS2 team:', error);
      return null;
    }
    return data;
  },

  /** Find or create a player by steam_id under a given team */
  async findOrCreatePlayer(steamId: string, name: string, teamId: string): Promise<CS2Player | null> {
    // Try existing
    const existing = await cs2Service.findPlayerBySteamId(steamId);
    if (existing) return existing;

    // Create
    return cs2Service.createPlayer({ team_id: teamId, name, steam_id: steamId });
  },

  // ===========================================================================
  // Matches (Series level)
  // ===========================================================================

  async getMatches(filters?: CS2MatchFilters): Promise<CS2Match[]> {
    const supabase = await createClient();
    let query = supabase
      .from('cs2_matches')
      .select(`
        *,
        team1:cs2_teams!cs2_matches_team1_id_fkey(*),
        team2:cs2_teams!cs2_matches_team2_id_fkey(*),
        maps:cs2_match_maps(*)
      `)
      .order('match_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.team_id) {
      query = query.or(`team1_id.eq.${filters.team_id},team2_id.eq.${filters.team_id}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching CS2 matches:', error);
      return [];
    }
    return data || [];
  },

  async getMatchById(id: string): Promise<CS2Match | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_matches')
      .select(`
        *,
        team1:cs2_teams!cs2_matches_team1_id_fkey(*),
        team2:cs2_teams!cs2_matches_team2_id_fkey(*),
        maps:cs2_match_maps(*, players:cs2_match_players(*, player:cs2_players(*)))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching CS2 match:', error);
      return null;
    }
    return data;
  },

  async createMatch(input: CreateCS2MatchInput): Promise<CS2Match | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_matches')
      .insert({
        team1_id: input.team1_id,
        team2_id: input.team2_id,
        match_date: input.match_date || new Date().toISOString(),
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating CS2 match:', error);
      return null;
    }
    return data;
  },

  async updateMatch(
    id: string,
    input: Partial<Pick<CS2Match, 'status' | 'winner_team_id' | 'notes'>>
  ): Promise<CS2Match | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_matches')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating CS2 match:', error);
      return null;
    }
    return data;
  },

  async deleteMatch(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from('cs2_matches').delete().eq('id', id);

    if (error) {
      console.error('Error deleting CS2 match:', error);
      return false;
    }
    return true;
  },

  // ===========================================================================
  // Match Maps (Per-map data within a series)
  // ===========================================================================

  async getMatchMaps(matchId: string): Promise<CS2MatchMap[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_match_maps')
      .select('*, players:cs2_match_players(*, player:cs2_players(*))')
      .eq('match_id', matchId)
      .order('map_number');

    if (error) {
      console.error('Error fetching CS2 match maps:', error);
      return [];
    }
    return data || [];
  },

  async createMatchMap(input: {
    match_id: string;
    map: string;
    map_number: number;
    team1_score: number;
    team2_score: number;
    rounds_played: number;
    winner_team_id: string | null;
    dathost_match_id?: string;
    dathost_status?: string;
  }): Promise<CS2MatchMap | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_match_maps')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating CS2 match map:', error);
      return null;
    }
    return data;
  },

  /** Update a match map (DatHost status, scores, ended_at) */
  async updateMatchMap(
    id: string,
    input: Partial<Pick<CS2MatchMap, 'team1_score' | 'team2_score' | 'rounds_played' | 'winner_team_id' | 'dathost_status' | 'ended_at'>>,
  ): Promise<CS2MatchMap | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_match_maps')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating CS2 match map:', error);
      return null;
    }
    return data;
  },

  /** Get a single match map by ID */
  async getMatchMapById(id: string): Promise<CS2MatchMap | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_match_maps')
      .select('*, players:cs2_match_players(*, player:cs2_players(*))')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching CS2 match map:', error);
      return null;
    }
    return data;
  },

  /** Get all active (non-finished) matches with their maps for the operations page */
  async getActiveMatches(): Promise<CS2Match[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cs2_matches')
      .select(`
        *,
        team1:cs2_teams!cs2_matches_team1_id_fkey(*),
        team2:cs2_teams!cs2_matches_team2_id_fkey(*),
        maps:cs2_match_maps(*)
      `)
      .in('status', ['PENDING', 'LIVE'])
      .order('match_date', { ascending: false });

    if (error) {
      console.error('Error fetching active CS2 matches:', error);
      return [];
    }
    return data || [];
  },

  async deleteMatchMap(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from('cs2_match_maps').delete().eq('id', id);

    if (error) {
      console.error('Error deleting CS2 match map:', error);
      return false;
    }
    return true;
  },

  /** Get next map number for a match */
  async getNextMapNumber(matchId: string): Promise<number> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('cs2_match_maps')
      .select('map_number')
      .eq('match_id', matchId)
      .order('map_number', { ascending: false })
      .limit(1);

    return (data?.[0]?.map_number ?? 0) + 1;
  },

  // ===========================================================================
  // Match Player Stats (per-map)
  // ===========================================================================

  async upsertMapPlayers(
    mapId: string,
    players: Omit<CS2MatchPlayer, 'id' | 'team' | 'player'>[]
  ): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('cs2_match_players')
      .upsert(
        players.map((p) => ({ ...p, map_id: mapId })),
        { onConflict: 'map_id,steam_id' }
      );

    if (error) {
      console.error('Error upserting CS2 match players:', error);
      return false;
    }
    return true;
  },

  // ===========================================================================
  // Team Standings (puan durumu)
  // ===========================================================================

  async getTeamStandings(): Promise<import('@/types').CS2TeamStanding[]> {
    const supabase = await createClient();

    // Get all teams
    const { data: teams } = await supabase
      .from('cs2_teams')
      .select('id, name, tag');
    if (!teams) return [];

    // Get all finished matches with maps
    const { data: matches } = await supabase
      .from('cs2_matches')
      .select('id, team1_id, team2_id, status, winner_team_id');
    if (!matches) return [];

    // Get all finished maps
    const { data: maps } = await supabase
      .from('cs2_match_maps')
      .select('id, match_id, winner_team_id, dathost_status');
    if (!maps) return [];

    const finishedMaps = maps.filter((m) => m.dathost_status === 'FINISHED');
    const finishedMatches = matches.filter((m) => m.status === 'FINISHED');

    const standings = new Map<string, {
      matches_played: number;
      matches_won: number;
      maps_played: number;
      maps_won: number;
    }>();

    // Initialize all teams
    for (const t of teams) {
      standings.set(t.id, { matches_played: 0, matches_won: 0, maps_played: 0, maps_won: 0 });
    }

    // Count matches
    for (const m of finishedMatches) {
      const t1 = standings.get(m.team1_id);
      const t2 = standings.get(m.team2_id);
      if (t1) t1.matches_played++;
      if (t2) t2.matches_played++;
      if (m.winner_team_id) {
        const winner = standings.get(m.winner_team_id);
        if (winner) winner.matches_won++;
      }
    }

    // Count maps
    for (const map of finishedMaps) {
      const match = matches.find((m) => m.id === map.match_id);
      if (!match) continue;
      const t1 = standings.get(match.team1_id);
      const t2 = standings.get(match.team2_id);
      if (t1) t1.maps_played++;
      if (t2) t2.maps_played++;
      if (map.winner_team_id) {
        const winner = standings.get(map.winner_team_id);
        if (winner) winner.maps_won++;
      }
    }

    // Build result sorted by points (maps_won) desc
    return teams
      .map((t) => {
        const s = standings.get(t.id) || { matches_played: 0, matches_won: 0, maps_played: 0, maps_won: 0 };
        return {
          team_id: t.id,
          team_name: t.name,
          team_tag: t.tag,
          matches_played: s.matches_played,
          matches_won: s.matches_won,
          maps_played: s.maps_played,
          maps_won: s.maps_won,
          points: s.maps_won, // 1 point per map won
        };
      })
      .filter((t) => t.maps_played > 0) // Only teams that played
      .sort((a, b) => b.points - a.points || b.matches_won - a.matches_won);
  },

  // ===========================================================================
  // Leaderboard (aggregated player stats across all maps)
  // ===========================================================================

  async getPlayerLeaderboard(): Promise<CS2PlayerLeaderboardEntry[]> {
    const supabase = await createClient();

    // Fetch all player stats rows with registered player info
    const { data, error } = await supabase
      .from('cs2_match_players')
      .select('steam_id, player_name, team_id, kills, deaths, assists, headshots, adr, mvps, entry_attempts, entry_successes, clutch_attempts, clutch_wins, player:cs2_players(name)');

    if (error) {
      console.error('Error fetching leaderboard data:', error);
      return [];
    }
    if (!data || data.length === 0) return [];

    // Fetch teams for tag lookup
    const { data: teams } = await supabase
      .from('cs2_teams')
      .select('id, name, tag');

    const teamMap = new Map<string, { name: string; tag: string }>();
    for (const t of teams || []) {
      teamMap.set(t.id, { name: t.name, tag: t.tag });
    }

    // Aggregate per steam_id
    const agg = new Map<string, {
      steam_id: string;
      player_name: string;
      team_id: string;
      maps: number;
      kills: number;
      deaths: number;
      assists: number;
      headshots: number;
      mvps: number;
      adr_sum: number;
      entry_attempts: number;
      entry_successes: number;
      clutch_attempts: number;
      clutch_wins: number;
    }>();

    for (const row of data) {
      // Prefer registered player name over CSV name
      const playerObj = row.player as unknown as { name: string } | null;
      const displayName = playerObj?.name || row.player_name;

      const existing = agg.get(row.steam_id);
      if (existing) {
        existing.maps += 1;
        existing.kills += row.kills;
        existing.deaths += row.deaths;
        existing.assists += row.assists;
        existing.headshots += row.headshots;
        existing.mvps += row.mvps;
        existing.adr_sum += Number(row.adr);
        existing.entry_attempts += row.entry_attempts;
        existing.entry_successes += row.entry_successes;
        existing.clutch_attempts += row.clutch_attempts;
        existing.clutch_wins += row.clutch_wins;
        // Use registered name if available
        existing.player_name = displayName;
        existing.team_id = row.team_id;
      } else {
        agg.set(row.steam_id, {
          steam_id: row.steam_id,
          player_name: displayName,
          team_id: row.team_id,
          maps: 1,
          kills: row.kills,
          deaths: row.deaths,
          assists: row.assists,
          headshots: row.headshots,
          mvps: row.mvps,
          adr_sum: Number(row.adr),
          entry_attempts: row.entry_attempts,
          entry_successes: row.entry_successes,
          clutch_attempts: row.clutch_attempts,
          clutch_wins: row.clutch_wins,
        });
      }
    }

    // Build leaderboard entries
    const entries: CS2PlayerLeaderboardEntry[] = [];
    for (const p of agg.values()) {
      const team = teamMap.get(p.team_id);
      const avgKd = p.deaths > 0 ? p.kills / p.deaths : p.kills;
      const avgKda = p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists;
      const hsPercent = p.kills > 0 ? (p.headshots / p.kills) * 100 : 0;

      entries.push({
        steam_id: p.steam_id,
        player_name: p.player_name,
        team_id: p.team_id,
        team_tag: team?.tag || '???',
        team_name: team?.name || '???',
        maps_played: p.maps,
        total_kills: p.kills,
        total_deaths: p.deaths,
        total_assists: p.assists,
        total_headshots: p.headshots,
        total_mvps: p.mvps,
        total_entry_attempts: p.entry_attempts,
        total_entry_successes: p.entry_successes,
        total_clutch_attempts: p.clutch_attempts,
        total_clutch_wins: p.clutch_wins,
        avg_adr: p.maps > 0 ? p.adr_sum / p.maps : 0,
        avg_kd: Number(avgKd.toFixed(2)),
        avg_kda: Number(avgKda.toFixed(2)),
        hs_percent: Number(hsPercent.toFixed(1)),
      });
    }

    // Sort by avg ADR descending by default
    entries.sort((a, b) => b.avg_adr - a.avg_adr);

    return entries;
  },
};
