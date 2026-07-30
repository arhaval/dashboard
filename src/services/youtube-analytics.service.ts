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

/**
 * Video bazında ÇEKİRDEK metrikler — bu set uzun süredir stabil, her kanalda
 * desteklenir. Sorgu bunlarla başarısız olursa sorun metrik seti değildir.
 */
const VIDEO_CORE_METRICS = [
  'views',
  'likes',
  'comments',
  'shares',
  'estimatedMinutesWatched',
  'averageViewDuration',
  'averageViewPercentage',
  'subscribersGained',
  'subscribersLost',
  'videosAddedToPlaylists',
  'videosRemovedFromPlaylists',
] as const;

/**
 * Daha yeni metrikler. Kanal/rapor kombinasyonuna göre 400 dönebilir; o durumda
 * sorgu çekirdek setle tekrarlanır ve bunlar "desteklenmiyor" işaretlenir.
 * Metrik adı UYDURULMAZ — yalnızca dokümante edilmiş adlar denenir.
 */
const VIDEO_OPTIONAL_METRICS = ['engagedViews'] as const;

/** Tek istekte sorulacak en fazla video (URL uzunluğu güvenli kalsın). */
const VIDEO_BATCH = 50;
const MAX_RETRY = 3;

export interface VideoAnalyticsRow {
  videoId: string;
  values: Record<string, number>;
}

export interface VideoAnalyticsResult {
  rows: VideoAnalyticsRow[];
  /** Denendi ama API kabul etmedi. */
  unsupportedMetrics: string[];
  requestedMetrics: string[];
  returnedMetrics: string[];
  /** Kanal bağlı değil / token yok. */
  notConnected?: boolean;
  error?: string;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO tarihi Analytics'in beklediği YYYY-MM-DD biçimine indir. */
function toDay(iso: string): string {
  return iso.slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Analytics raporu çek. 429 ve 5xx'te üstel geri çekilmeyle tekrar dener;
 * 400 (geçersiz metrik) tekrar denenmez — çağıran metrik setini daraltır.
 */
async function fetchReport(
  url: string,
  accessToken: string
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  let wait = 500;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, status: res.status, data };
    // Geçici hatalar: bekle ve tekrar dene.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRY) {
      await sleep(wait);
      wait *= 2;
      continue;
    }
    return { ok: false, status: res.status, data };
  }
  return { ok: false, status: 0, data: {} };
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

  /**
   * VIDEO BAZINDA metrikler. Videolar batch'lenir — her video için ayrı istek
   * atmak quota ve gecikme açısından sürdürülemez.
   *
   * `startDate` bütün batch için ortak olmalı; en eski videonun yayın tarihi
   * kullanılır. Analytics kümülatif rapor döndürdüğü için erken başlangıç
   * sonucu bozmaz, yalnızca sorgu aralığını genişletir.
   */
  async queryVideoMetrics(
    videoIds: string[],
    opts: { startDate: string; endDate?: string }
  ): Promise<VideoAnalyticsResult> {
    const requested = [...VIDEO_CORE_METRICS, ...VIDEO_OPTIONAL_METRICS];
    const base: VideoAnalyticsResult = {
      rows: [], unsupportedMetrics: [], requestedMetrics: requested, returnedMetrics: [],
    };
    if (videoIds.length === 0) return base;

    const accessToken = await this.getAccessToken();
    if (!accessToken) return { ...base, notConnected: true, error: 'YouTube Analytics bağlı değil' };

    const endDate = opts.endDate ?? today();
    const startDate = toDay(opts.startDate);

    let metrics: string[] = [...requested];
    const unsupported: string[] = [];
    const rows: VideoAnalyticsRow[] = [];

    for (let i = 0; i < videoIds.length; i += VIDEO_BATCH) {
      const chunk = videoIds.slice(i, i + VIDEO_BATCH);
      const build = (m: string[]) =>
        `${REPORTS_URL}?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}` +
        `&metrics=${m.join(',')}&dimensions=video&filters=video==${chunk.join(',')}&maxResults=${VIDEO_BATCH}`;

      let res = await fetchReport(build(metrics), accessToken);

      // Metrik seti kabul edilmediyse çekirdek setle bir kez daha dene.
      if (!res.ok && res.status === 400 && metrics.length > VIDEO_CORE_METRICS.length) {
        unsupported.push(...VIDEO_OPTIONAL_METRICS.filter((m) => !unsupported.includes(m)));
        metrics = [...VIDEO_CORE_METRICS];
        res = await fetchReport(build(metrics), accessToken);
      }

      if (!res.ok) {
        // Bir batch'in düşmesi diğerlerini düşürmez; elde olan döner.
        const err = (res.data.error as { message?: string } | undefined)?.message;
        return { ...base, rows, unsupportedMetrics: unsupported, returnedMetrics: metrics, error: err ?? `Analytics HTTP ${res.status}` };
      }

      // columnHeaders sırası metrics sırasını takip eder; ilk sütun 'video'.
      const headers = ((res.data.columnHeaders ?? []) as { name: string }[]).map((h) => h.name);
      for (const raw of (res.data.rows ?? []) as unknown[][]) {
        const values: Record<string, number> = {};
        let videoId = '';
        raw.forEach((cell, idx) => {
          const name = headers[idx];
          if (name === 'video') videoId = String(cell);
          else if (name) {
            const n = Number(cell);
            if (Number.isFinite(n)) values[name] = n;
          }
        });
        if (videoId) rows.push({ videoId, values });
      }
    }

    return { rows, unsupportedMetrics: unsupported, requestedMetrics: requested, returnedMetrics: metrics };
  },

  /**
   * Analytics verisinin GERÇEKTEN hangi güne kadar hazır olduğu.
   *
   * API istenen endDate'i sessizce kırpar: bugünü isteyip dünden önceki bir
   * güne kadar veri alabilirsin. Bunu bilmeden checkpoint'i "tamamlandı"
   * saymak, aslında ölçülmemiş bir noktayı ölçülmüş göstermek olur.
   *
   * Kanal seviyesinde tek bir ucuz sorgu; sonuç bütün videolar için geçerli.
   */
  async getDataThroughDate(): Promise<{ dataThroughDate: string | null; requestedEndDate: string; error?: string }> {
    const requestedEndDate = today();
    const accessToken = await this.getAccessToken();
    if (!accessToken) return { dataThroughDate: null, requestedEndDate, error: 'YouTube Analytics bağlı değil' };

    const start = new Date(Date.now() - 14 * 86_400_000);
    const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const url =
      `${REPORTS_URL}?ids=channel==MINE&startDate=${startDate}&endDate=${requestedEndDate}` +
      `&metrics=views&dimensions=day&sort=day`;

    const res = await fetchReport(url, accessToken);
    if (!res.ok) {
      const err = (res.data.error as { message?: string } | undefined)?.message;
      return { dataThroughDate: null, requestedEndDate, error: err ?? `Analytics HTTP ${res.status}` };
    }
    const rows = (res.data.rows ?? []) as unknown[][];
    const last = rows[rows.length - 1];
    const dataThroughDate = last ? String(last[0]) : null;
    return { dataThroughDate, requestedEndDate };
  },

  /**
   * Tek videonun GÜNLÜK dökümü — geçmiş checkpoint'lerini yeniden kurmak için.
   *
   * Ortalama metrikler (averageViewDuration / averageViewPercentage) bilerek
   * İSTENMEZ: günlük ortalamalar toplanamaz, ağırlıklı hesap gerekir. O yüzden
   * checkpoint'in ortalama alanları ayrı bir aralık sorgusuyla doldurulur.
   */
  async queryVideoDaily(
    videoId: string,
    startDate: string,
    endDate?: string
  ): Promise<{ days: { day: string; values: Record<string, number> }[]; error?: string }> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return { days: [], error: 'YouTube Analytics bağlı değil' };

    const metrics = [
      'views', 'likes', 'comments', 'shares', 'estimatedMinutesWatched',
      'subscribersGained', 'subscribersLost', 'videosAddedToPlaylists', 'videosRemovedFromPlaylists',
    ];
    const url =
      `${REPORTS_URL}?ids=channel==MINE&startDate=${toDay(startDate)}&endDate=${endDate ?? today()}` +
      `&metrics=${metrics.join(',')}&dimensions=day&filters=video==${videoId}&sort=day`;

    const res = await fetchReport(url, accessToken);
    if (!res.ok) {
      const err = (res.data.error as { message?: string } | undefined)?.message;
      return { days: [], error: err ?? `Analytics HTTP ${res.status}` };
    }

    const headers = ((res.data.columnHeaders ?? []) as { name: string }[]).map((h) => h.name);
    const days: { day: string; values: Record<string, number> }[] = [];
    for (const raw of (res.data.rows ?? []) as unknown[][]) {
      const values: Record<string, number> = {};
      let day = '';
      raw.forEach((cell, idx) => {
        const name = headers[idx];
        if (name === 'day') day = String(cell);
        else if (name) {
          const n = Number(cell);
          if (Number.isFinite(n)) values[name] = n;
        }
      });
      if (day) days.push({ day, values });
    }
    return { days };
  },

  /**
   * Bir videonun BELİRLİ ARALIK için toplu metrikleri — ortalamaların doğru
   * (API tarafından ağırlıklandırılmış) değerini almak için. Günlük satırları
   * toplayarak ortalama üretmek matematiksel olarak yanlış olurdu.
   */
  async queryVideoRange(
    videoId: string,
    startDate: string,
    endDate: string
  ): Promise<{ values: Record<string, number>; error?: string }> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return { values: {}, error: 'YouTube Analytics bağlı değil' };

    const url =
      `${REPORTS_URL}?ids=channel==MINE&startDate=${toDay(startDate)}&endDate=${toDay(endDate)}` +
      `&metrics=${VIDEO_CORE_METRICS.join(',')}&filters=video==${videoId}`;

    const res = await fetchReport(url, accessToken);
    if (!res.ok) {
      const err = (res.data.error as { message?: string } | undefined)?.message;
      return { values: {}, error: err ?? `Analytics HTTP ${res.status}` };
    }
    const headers = ((res.data.columnHeaders ?? []) as { name: string }[]).map((h) => h.name);
    const row = ((res.data.rows ?? []) as unknown[][])[0];
    const values: Record<string, number> = {};
    if (row) {
      row.forEach((cell, idx) => {
        const n = Number(cell);
        if (headers[idx] && Number.isFinite(n)) values[headers[idx]] = n;
      });
    }
    return { values };
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
