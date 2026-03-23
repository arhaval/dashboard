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
};
