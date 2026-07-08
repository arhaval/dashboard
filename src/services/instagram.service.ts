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
import {
  classifyIgGenre,
  type IgGenre,
} from '@/app/(dashboard)/icerik-performansi/ig-perf.constants';

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

    // fetch the Graph-queryable user_id (me.user_id) + username
    let username: string | null = null;
    let graphUserId: string | null = igUserId || null;
    try {
      const me = await fetch(`${GRAPH}/me?fields=user_id,username&access_token=${long.access_token}`);
      const meData = await me.json();
      username = meData.username ?? null;
      if (meData.user_id) graphUserId = String(meData.user_id);
    } catch {
      /* ignore */
    }

    const admin = createAdminClient();
    await admin.from('instagram_oauth').upsert({
      id: 1,
      access_token: long.access_token,
      token_expires_at: expiresAt,
      ig_user_id: graphUserId,
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
  /** Resolve the Graph-queryable IG user id (me.user_id), not the OAuth app-scoped id. */
  async resolveUserId(token: string): Promise<string | null> {
    try {
      const res = await fetch(`${GRAPH}/me?fields=user_id&access_token=${token}`);
      const data = await res.json();
      return data.user_id ? String(data.user_id) : null;
    } catch {
      return null;
    }
  },

  async queryMonth(month: string): Promise<
    | { views: number; likes: number; comments: number; saves: number; shares: number }
    | null
  > {
    const auth = await this.getValidToken();
    if (!auth) return null;
    const igId = await this.resolveUserId(auth.token);
    if (!igId) return null;
    const { since, until } = monthRangeUnix(month);

    const url =
      `${GRAPH}/${igId}/insights?metric=views,likes,comments,saves,shares` +
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
      saves: pick('saves'),
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

  /** Pull all posts/reels into instagram_media (preserves claude_comment). */
  async syncMedia(): Promise<{ synced: number; error?: string }> {
    const auth = await this.getValidToken();
    if (!auth) return { synced: 0, error: 'Instagram bağlı değil' };

    const fields =
      'id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count';
    let url: string | null = `${GRAPH}/me/media?fields=${fields}&limit=100&access_token=${auth.token}`;

    interface IgMedia {
      id: string;
      caption?: string;
      media_type?: string;
      media_product_type?: string;
      thumbnail_url?: string;
      media_url?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    }

    interface IgMediaResponse {
      data?: IgMedia[];
      paging?: { next?: string };
      error?: { message: string };
    }

    const rows: Record<string, unknown>[] = [];
    let pages = 0;
    while (url && pages < 30) {
      const res: Response = await fetch(url);
      const data: IgMediaResponse = await res.json();
      if (data.error) return { synced: rows.length, error: data.error.message };
      for (const m of (data.data ?? []) as IgMedia[]) {
        let content_type = 'post';
        if (m.media_product_type === 'REELS') content_type = 'reels';
        else if (m.media_type === 'CAROUSEL_ALBUM') content_type = 'carousel';
        else if (m.media_type === 'VIDEO') content_type = 'video';
        else content_type = 'post';
        rows.push({
          media_id: m.id,
          caption: m.caption ?? null,
          content_type,
          permalink: m.permalink ?? null,
          thumbnail_url: m.thumbnail_url || m.media_url || null,
          published_at: m.timestamp ?? null,
          like_count: Number(m.like_count ?? 0),
          comment_count: Number(m.comments_count ?? 0),
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      url = data.paging?.next ?? null;
      pages += 1;
    }
    if (rows.length === 0) return { synced: 0 };

    const admin = createAdminClient();
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin
        .from('instagram_media')
        .upsert(rows.slice(i, i + 500), { onConflict: 'media_id' });
      if (error) return { synced: i, error: error.message };
    }

    // Auto-assign genre for non-locked rows (manual overrides preserved).
    const idsByGenre = new Map<IgGenre, string[]>();
    for (const r of rows) {
      const g = classifyIgGenre((r.caption as string | null) ?? null);
      const arr = idsByGenre.get(g) ?? [];
      arr.push(r.media_id as string);
      idsByGenre.set(g, arr);
    }
    for (const [genre, ids] of idsByGenre) {
      await admin
        .from('instagram_media')
        .update({ genre })
        .in('media_id', ids)
        .eq('genre_locked', false);
    }

    return { synced: rows.length };
  },
};
