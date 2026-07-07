/**
 * YouTube Analytics API (OAuth) service.
 * Pulls TRUE per-month metrics (o ay içinde) split by content type via the
 * creatorContentType dimension — the same numbers YouTube Studio shows:
 *   VIDEO_ON_DEMAND -> video_views, SHORTS -> shorts_views, LIVE_STREAM -> live_views
 * No double counting: YouTube itself classifies each row.
 *
 * Only writes the per-month view/like/comment fields; subscribers_total and the
 * manual avg/peak live-viewer fields are left untouched.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REPORTS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';
const SCOPE = 'https://www.googleapis.com/auth/yt-analytics.readonly';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** startDate/endDate for a month ('YYYY-MM'); endDate capped at today. */
function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  let end = `${y}-${pad(m)}-${pad(lastDay)}`;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (end > todayStr) end = todayStr;
  return { start, end };
}

export const youtubeAnalyticsService = {
  /** Build the Google consent URL for connecting the channel. */
  authUrl(redirectUri: string, state: string): string {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID ?? '';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /** Exchange an auth code for tokens and persist the refresh token. */
  async exchangeCode(code: string, redirectUri: string): Promise<{ ok: boolean; error?: string }> {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return { ok: false, error: 'OAuth env eksik' };

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.refresh_token) {
      return { ok: false, error: data.error_description || data.error || 'Token alınamadı (refresh_token yok)' };
    }

    const admin = createAdminClient();
    await admin
      .from('youtube_oauth')
      .upsert({ id: 1, refresh_token: data.refresh_token, updated_at: new Date().toISOString() });
    return { ok: true };
  },

  async getStatus(): Promise<{ connected: boolean }> {
    const admin = createAdminClient();
    const { data } = await admin.from('youtube_oauth').select('refresh_token').eq('id', 1).maybeSingle();
    return { connected: Boolean(data?.refresh_token) };
  },

  async getAccessToken(): Promise<string | null> {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const admin = createAdminClient();
    const { data } = await admin.from('youtube_oauth').select('refresh_token').eq('id', 1).maybeSingle();
    const refresh = data?.refresh_token;
    if (!refresh) return null;

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh,
        grant_type: 'refresh_token',
      }),
    });
    const token = await res.json();
    return res.ok ? (token.access_token as string) : null;
  },

  /**
   * Query one month's metrics split by content type. Returns null if the
   * channel isn't connected or the API fails.
   */
  async queryMonth(month: string): Promise<
    | { video_views: number; shorts_views: number; live_views: number; total_likes: number; total_comments: number }
    | null
  > {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return null;

    const { start, end } = monthRange(month);
    const url =
      `${REPORTS_URL}?ids=channel==MINE&startDate=${start}&endDate=${end}` +
      `&metrics=views,likes,comments&dimensions=creatorContentType`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    if (!res.ok) return null;

    let video_views = 0;
    let shorts_views = 0;
    let live_views = 0;
    let total_likes = 0;
    let total_comments = 0;

    for (const row of (data.rows ?? []) as [string, number, number, number][]) {
      const [rawType, views, likes, comments] = row;
      // API returns camelCase: videoOnDemand / shorts / liveStream / posts
      const t = String(rawType).toLowerCase();
      let bucket: 'video' | 'shorts' | 'live' | null = null;
      if (t === 'videoondemand') bucket = 'video';
      else if (t === 'shorts') bucket = 'shorts';
      else if (t === 'livestream') bucket = 'live';
      if (!bucket) continue; // ignore 'posts' (community posts) / story / unspecified

      const v = Number(views) || 0;
      if (bucket === 'video') video_views += v;
      else if (bucket === 'shorts') shorts_views += v;
      else live_views += v;
      total_likes += Number(likes) || 0;
      total_comments += Number(comments) || 0;
    }

    return { video_views, shorts_views, live_views, total_likes, total_comments };
  },

  /** Current cumulative subscriber count via the Data API (no OAuth needed). */
  async fetchSubscribers(): Promise<number | null> {
    const KEY = process.env.YOUTUBE_API_KEY;
    const CH = process.env.YOUTUBE_CHANNEL_ID;
    if (!KEY || !CH) return null;
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CH}&key=${KEY}`
      );
      const d = await res.json();
      const n = Number(d.items?.[0]?.statistics?.subscriberCount);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  },

  /**
   * Write one month's per-month view/like/comment values into
   * social_monthly_metrics, preserving manual avg/peak. For the current month
   * it also refreshes subscribers_total (cumulative).
   */
  async fillMonth(month: string): Promise<{ ok: boolean; error?: string }> {
    const metrics = await this.queryMonth(month);
    if (!metrics) return { ok: false, error: 'Analytics verisi alınamadı (kanal bağlı mı?)' };

    const admin = createAdminClient();
    const patch: Record<string, unknown> = { ...metrics, updated_at: new Date().toISOString() };

    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (month === curMonth) {
      const subs = await this.fetchSubscribers();
      if (subs != null) patch.subscribers_total = subs;
    }
    const { data: existing } = await admin
      .from('social_monthly_metrics')
      .select('id')
      .eq('month', month)
      .eq('platform', 'YOUTUBE')
      .maybeSingle();

    if (existing) {
      const { error } = await admin.from('social_monthly_metrics').update(patch).eq('id', existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await admin
        .from('social_monthly_metrics')
        .insert({ month, platform: 'YOUTUBE', followers_total: 0, ...patch });
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  },

  /** Backfill a range of months (inclusive), oldest to newest. */
  async backfill(fromMonth: string, toMonth: string): Promise<{ filled: number; error?: string }> {
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
