/**
 * Instagram Graph API (Instagram Login) service.
 * - OAuth: code -> short-lived -> long-lived (60d) token, stored + auto-refreshed.
 * - follower_count -> social_monthly_metrics.followers_total (current month).
 * - per-month engagement (views/likes/comments/saved/shares) via account insights.
 *
 * Instagram long-lived tokens last 60 days and must be refreshed (no permanent
 * refresh token like Google). getValidToken() refreshes when near expiry.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';
const SCOPES = 'instagram_business_basic,instagram_business_manage_insights';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Unix seconds for the start/end of a month ('YYYY-MM'); end capped at now. */
function monthRangeUnix(month: string): { since: number; until: number } {
  const [y, m] = month.split('-').map(Number);
  const start = Math.floor(new Date(y, m - 1, 1, 0, 0, 0).getTime() / 1000);
  let end = Math.floor(new Date(y, m, 1, 0, 0, 0).getTime() / 1000); // first of next month
  const now = Math.floor(Date.now() / 1000);
  if (end > now) end = now;
  return { since: start, until: end };
}

interface IgRow {
  access_token: string | null;
  token_expires_at: string | null;
  ig_user_id: string | null;
  username: string | null;
}

export const instagramService = {
  authUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<{ ok: boolean; error?: string }> {
    const appId = process.env.INSTAGRAM_APP_ID;
    const secret = process.env.INSTAGRAM_APP_SECRET;
    if (!appId || !secret) return { ok: false, error: 'Instagram OAuth env eksik' };

    // 1. code -> short-lived token (+ user_id)
    const shortRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: secret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });
    const short = await shortRes.json();
    if (!shortRes.ok || !short.access_token) {
      return { ok: false, error: short.error_message || short.error?.message || 'Kısa token alınamadı' };
    }
    const igUserId = short.user_id != null ? String(short.user_id) : '';

    // 2. short -> long-lived (60 days)
    const longRes = await fetch(
      `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${secret}&access_token=${short.access_token}`
    );
    const long = await longRes.json();
    if (!longRes.ok || !long.access_token) {
      return { ok: false, error: long.error?.message || 'Uzun token alınamadı' };
    }

    const expiresAt = new Date(Date.now() + (Number(long.expires_in) || 5184000) * 1000).toISOString();

    // fetch username for display
    let username: string | null = null;
    try {
      const me = await fetch(`${GRAPH}/me?fields=user_id,username&access_token=${long.access_token}`);
      const meData = await me.json();
      username = meData.username ?? null;
    } catch {
      /* ignore */
    }

    const admin = createAdminClient();
    await admin.from('instagram_oauth').upsert({
      id: 1,
      access_token: long.access_token,
      token_expires_at: expiresAt,
      ig_user_id: igUserId || null,
      username,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  },

  async getStatus(): Promise<{ connected: boolean; username?: string | null }> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('instagram_oauth')
      .select('access_token, username')
      .eq('id', 1)
      .maybeSingle();
    return { connected: Boolean(data?.access_token), username: data?.username };
  },

  /** Returns a valid token, refreshing it when within ~7 days of expiry. */
  async getValidToken(): Promise<{ token: string; igUserId: string } | null> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('instagram_oauth')
      .select('access_token, token_expires_at, ig_user_id')
      .eq('id', 1)
      .maybeSingle<IgRow>();
    if (!data?.access_token) return null;

    let token = data.access_token;
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
    const sevenDays = 7 * 24 * 3600 * 1000;
    if (expiresAt - Date.now() < sevenDays) {
      try {
        const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
        const refreshed = await res.json();
        if (res.ok && refreshed.access_token) {
          token = refreshed.access_token;
          const newExpiry = new Date(
            Date.now() + (Number(refreshed.expires_in) || 5184000) * 1000
          ).toISOString();
          await admin
            .from('instagram_oauth')
            .update({ access_token: token, token_expires_at: newExpiry, updated_at: new Date().toISOString() })
            .eq('id', 1);
        }
      } catch {
        /* keep old token */
      }
    }
    return { token, igUserId: data.ig_user_id ?? '' };
  },

  /** Current follower count. */
  async fetchFollowers(): Promise<number | null> {
    const auth = await this.getValidToken();
    if (!auth) return null;
    const res = await fetch(`${GRAPH}/me?fields=followers_count&access_token=${auth.token}`);
    const data = await res.json();
    const n = Number(data.followers_count);
    return Number.isFinite(n) ? n : null;
  },

  /** One month of account-level engagement totals. */
  async queryMonth(month: string): Promise<
    | { views: number; likes: number; comments: number; saves: number; shares: number }
    | null
  > {
    const auth = await this.getValidToken();
    if (!auth || !auth.igUserId) return null;
    const { since, until } = monthRangeUnix(month);

    const url =
      `${GRAPH}/${auth.igUserId}/insights?metric=views,likes,comments,saved,shares` +
      `&metric_type=total_value&period=day&since=${since}&until=${until}&access_token=${auth.token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data)) return null;

    const pick = (name: string): number => {
      const item = data.data.find((d: { name: string }) => d.name === name);
      const v = item?.total_value?.value;
      return Number(v) || 0;
    };
    return {
      views: pick('views'),
      likes: pick('likes'),
      comments: pick('comments'),
      saves: pick('saved'),
      shares: pick('shares'),
    };
  },

  async fillMonth(month: string): Promise<{ ok: boolean; error?: string }> {
    const metrics = await this.queryMonth(month);
    if (!metrics) return { ok: false, error: 'Instagram verisi alınamadı (bağlı mı?)' };

    const admin = createAdminClient();
    const patch: Record<string, unknown> = { ...metrics, updated_at: new Date().toISOString() };

    const now = new Date();
    const curMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    if (month === curMonth) {
      const followers = await this.fetchFollowers();
      if (followers != null) patch.followers_total = followers;
    }

    const { data: existing } = await admin
      .from('social_monthly_metrics')
      .select('id')
      .eq('month', month)
      .eq('platform', 'INSTAGRAM')
      .maybeSingle();

    if (existing) {
      const { error } = await admin.from('social_monthly_metrics').update(patch).eq('id', existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await admin
        .from('social_monthly_metrics')
        .insert({ month, platform: 'INSTAGRAM', followers_total: 0, ...patch });
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  },

  async backfill(fromMonth: string, toMonth: string): Promise<{ filled: number }> {
    const months: string[] = [];
    let [y, m] = fromMonth.split('-').map(Number);
    const [ty, tm] = toMonth.split('-').map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      months.push(`${y}-${pad(m)}`);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    let filled = 0;
    for (const mo of months) {
      const r = await this.fillMonth(mo);
      if (r.ok) filled += 1;
    }
    return { filled };
  },
};
