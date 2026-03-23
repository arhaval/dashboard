/**
 * DatHost API Service
 * Handles all communication with DatHost CS2 Match API + local server/event management
 */

import { createClient } from '@/lib/supabase/server';
import type {
  DatHostServer,
  DatHostMatchResponse,
  DatHostServerStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DATHOST_API_BASE = 'https://dathost.net/api/0.1';

function getAuthHeader(): string {
  const email = process.env.DATHOST_EMAIL;
  const password = process.env.DATHOST_PASSWORD;
  if (!email || !password) {
    throw new Error('DATHOST_EMAIL and DATHOST_PASSWORD must be set');
  }
  return 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');
}

async function fetchDatHost<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | null> {
  try {
    const res = await fetch(`${DATHOST_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`DatHost API ${res.status}: ${body}`);
      return null;
    }

    // Some endpoints return empty body (204)
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('DatHost API error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const dathostService = {
  // ==========================================================================
  // DatHost API calls
  // ==========================================================================

  /** Start a new match on a DatHost server */
  async startMatch(input: {
    dathostServerId: string;
    map: string;
    team1Name: string;
    team2Name: string;
    players: { steam_id_64: string; team: 'team1' | 'team2' }[];
  }): Promise<DatHostMatchResponse | null> {
    return fetchDatHost<DatHostMatchResponse>('/cs2-matches', {
      method: 'POST',
      body: JSON.stringify({
        game_server_id: input.dathostServerId,
        team1: { name: input.team1Name },
        team2: { name: input.team2Name },
        players: input.players.map((p) => ({
          steam_id_64: p.steam_id_64,
          team: p.team,
        })),
        settings: {
          map: input.map,
        },
      }),
    });
  },

  /** Get current match status and stats */
  async getMatch(dathostMatchId: string): Promise<DatHostMatchResponse | null> {
    return fetchDatHost<DatHostMatchResponse>(`/cs2-matches/${dathostMatchId}`);
  },

  /** Cancel a running match */
  async cancelMatch(dathostMatchId: string): Promise<boolean> {
    const res = await fetchDatHost(`/cs2-matches/${dathostMatchId}/cancel`, {
      method: 'POST',
    });
    return res !== null;
  },

  // ==========================================================================
  // Server CRUD (Supabase)
  // ==========================================================================

  async getServers(): Promise<DatHostServer[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('dathost_servers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('getServers error:', error);
      return [];
    }
    return data || [];
  },

  async getAvailableServers(): Promise<DatHostServer[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('dathost_servers')
      .select('*')
      .eq('is_active', true)
      .eq('server_status', 'IDLE')
      .order('name');

    if (error) {
      console.error('getAvailableServers error:', error);
      return [];
    }
    return data || [];
  },

  async createServer(input: {
    dathost_server_id: string;
    name: string;
  }): Promise<DatHostServer | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('dathost_servers')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('createServer error:', error);
      return null;
    }
    return data;
  },

  async deleteServer(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('dathost_servers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteServer error:', error);
      return false;
    }
    return true;
  },

  async updateServerStatus(
    id: string,
    serverStatus: DatHostServerStatus,
    lastUsedAt?: string,
  ): Promise<boolean> {
    const supabase = await createClient();
    const update: Record<string, unknown> = { server_status: serverStatus };
    if (lastUsedAt) update.last_used_at = lastUsedAt;

    const { error } = await supabase
      .from('dathost_servers')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('updateServerStatus error:', error);
      return false;
    }
    return true;
  },

  // ==========================================================================
  // Event Log (idempotency + audit)
  // ==========================================================================

  /** Log an event. Returns false if already exists (idempotent). */
  async logEvent(
    dathostMatchId: string,
    eventType: string,
    payload: Record<string, unknown> = {},
  ): Promise<{ id: string; alreadyExists: boolean } | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('dathost_event_log')
      .insert({
        dathost_match_id: dathostMatchId,
        event_type: eventType,
        payload,
      })
      .select('id')
      .single();

    if (error) {
      // Unique constraint violation = already exists
      if (error.code === '23505') {
        return { id: '', alreadyExists: true };
      }
      console.error('logEvent error:', error);
      return null;
    }
    return { id: data.id, alreadyExists: false };
  },

  async markEventProcessed(
    dathostMatchId: string,
    eventType: string,
    errorMessage?: string,
  ): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('dathost_event_log')
      .update({
        processed: true,
        error_message: errorMessage || null,
      })
      .eq('dathost_match_id', dathostMatchId)
      .eq('event_type', eventType);

    if (error) {
      console.error('markEventProcessed error:', error);
      return false;
    }
    return true;
  },

  // ==========================================================================
  // DatHost File API (server files access)
  // ==========================================================================

  /** List files in a directory on the game server */
  async listServerFiles(
    dathostServerId: string,
    path: string = '',
  ): Promise<string[]> {
    try {
      const encodedPath = encodeURIComponent(path);
      const res = await fetch(
        `${DATHOST_API_BASE}/game-servers/${dathostServerId}/files/${encodedPath}`,
        {
          headers: { Authorization: getAuthHeader() },
        },
      );
      if (!res.ok) return [];
      return (await res.json()) as string[];
    } catch {
      return [];
    }
  },

  /** Download a file from the game server as text */
  async downloadServerFile(
    dathostServerId: string,
    path: string,
  ): Promise<string | null> {
    try {
      const encodedPath = encodeURIComponent(path);
      const res = await fetch(
        `${DATHOST_API_BASE}/game-servers/${dathostServerId}/files/${encodedPath}`,
        {
          headers: { Authorization: getAuthHeader() },
        },
      );
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  },

  /** Scan MatchZy_Stats folder for CSV files — tries cs2/ then csgo/ paths */
  async scanMatchZyStats(
    dathostServerId: string,
  ): Promise<{ matchId: string; csvPath: string; csvName: string }[]> {
    const results: { matchId: string; csvPath: string; csvName: string }[] = [];

    // Try both cs2/ and csgo/ paths (DatHost uses different roots)
    const basePaths = ['cs2/MatchZy_Stats', 'csgo/MatchZy_Stats'];
    let activePath = '';

    for (const basePath of basePaths) {
      const matchFolders = await this.listServerFiles(dathostServerId, basePath);
      if (matchFolders.length > 0) {
        activePath = basePath;
        for (const folder of matchFolders) {
          if (!/^\d+$/.test(folder)) continue;

          const files = await this.listServerFiles(
            dathostServerId,
            `${basePath}/${folder}`,
          );

          for (const file of files) {
            if (file.endsWith('.csv')) {
              results.push({
                matchId: folder,
                csvPath: `${basePath}/${folder}/${file}`,
                csvName: file,
              });
            }
          }
        }
        break; // Found files, stop searching
      }
    }

    return results;
  },

  /** Download a binary file from the game server */
  async downloadServerFileBinary(
    dathostServerId: string,
    path: string,
  ): Promise<ArrayBuffer | null> {
    try {
      const encodedPath = encodeURIComponent(path);
      const res = await fetch(
        `${DATHOST_API_BASE}/game-servers/${dathostServerId}/files/${encodedPath}`,
        {
          headers: { Authorization: getAuthHeader() },
        },
      );
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  },

  /** Read MatchZy SQLite database and return match data — tries cs2/ then csgo/ */
  async readMatchZyDatabase(
    dathostServerId: string,
  ): Promise<MatchZyMatch[]> {
    const dbPaths = [
      'cs2/addons/counterstrikesharp/plugins/MatchZy/matchzy.db',
      'csgo/addons/counterstrikesharp/plugins/MatchZy/matchzy.db',
    ];

    let dbBuffer: ArrayBuffer | null = null;
    for (const p of dbPaths) {
      dbBuffer = await this.downloadServerFileBinary(dathostServerId, p);
      if (dbBuffer) break;
    }
    if (!dbBuffer) return [];

    try {
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs();
      const db = new SQL.Database(new Uint8Array(dbBuffer));

      // Get maps with scores
      const mapsResult = db.exec(`
        SELECT m.matchid, m.mapnumber, m.team1_name, m.team1_score,
               m.team2_name, m.team2_score, m.mapname
        FROM matchzy_stats_maps m
        ORDER BY m.matchid DESC, m.mapnumber ASC
      `);

      const matches: MatchZyMatch[] = [];
      if (mapsResult.length > 0) {
        for (const row of mapsResult[0].values) {
          matches.push({
            matchId: String(row[0]),
            mapNumber: Number(row[1]),
            team1Name: String(row[2] || 'Team 1'),
            team1Score: Number(row[3]),
            team2Name: String(row[4] || 'Team 2'),
            team2Score: Number(row[5]),
            mapName: String(row[6] || ''),
          });
        }
      }

      db.close();
      return matches;
    } catch (err) {
      console.error('Error reading MatchZy database:', err);
      return [];
    }
  },
};

export type MatchZyMatch = {
  matchId: string;
  mapNumber: number;
  team1Name: string;
  team1Score: number;
  team2Name: string;
  team2Score: number;
  mapName: string;
};
