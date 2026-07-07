/**
 * YouTube sync service.
 * Fetches the channel's last 30 uploads via YouTube Data API v3 and upserts
 * their metrics into `video_performance`. Uses the service-role admin client
 * (bypasses RLS) so it can run from a cron route with no user session.
 *
 * IMPORTANT: the upsert intentionally omits claude_comment / commented_at so
 * previously generated comments are preserved across syncs.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { ContentType } from '@/app/(dashboard)/icerik-performansi/perf.constants';

const YT = 'https://www.googleapis.com/youtube/v3';
const MAX_VIDEOS = 5000; // safety backstop; in practice pulls the ENTIRE channel
const PAGE_SIZE = 50;    // playlistItems / videos.list max per request
const UPSERT_BATCH = 500;
const SHORT_MAX_SECONDS = 120; // non-live and <=120s counts as a Short

interface SyncResult {
  synced: number;
  error?: string;
}

/** Parse an ISO-8601 duration (PT#H#M#S) into seconds. */
function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, h, min, s] = m;
  return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

function classify(isLive: boolean, seconds: number): ContentType {
  if (isLive) return 'live';
  if (seconds > 0 && seconds <= SHORT_MAX_SECONDS) return 'short';
  return 'video';
}

interface RollupRow {
  view_count: number;
  like_count: number;
  comment_count: number;
  content_type: ContentType;
}

/**
 * Aggregate the synced videos by type and write the current month's YouTube
 * row in social_monthly_metrics. Only the auto fields are set; avg/peak live
 * viewers (manual entry) are never overwritten. Non-fatal — a failure here
 * does not fail the video sync.
 */
async function rollUpMonthlyMetrics(
  admin: ReturnType<typeof createAdminClient>,
  rows: RollupRow[],
  subscribers: number
): Promise<void> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (month < '2026-07') return; // only from July 2026 onward

  let video_views = 0;
  let shorts_views = 0;
  let live_views = 0;
  let total_likes = 0;
  let total_comments = 0;
  for (const r of rows) {
    total_likes += r.like_count;
    total_comments += r.comment_count;
    if (r.content_type === 'video') video_views += r.view_count;
    else if (r.content_type === 'short') shorts_views += r.view_count;
    else if (r.content_type === 'live') live_views += r.view_count;
  }

  const auto = {
    subscribers_total: subscribers,
    video_views,
    shorts_views,
    live_views,
    total_likes,
    total_comments,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: existing } = await admin
      .from('social_monthly_metrics')
      .select('id')
      .eq('month', month)
      .eq('platform', 'YOUTUBE')
      .maybeSingle();

    if (existing) {
      await admin.from('social_monthly_metrics').update(auto).eq('id', existing.id);
    } else {
      await admin
        .from('social_monthly_metrics')
        .insert({ month, platform: 'YOUTUBE', followers_total: 0, ...auto });
    }
  } catch {
    // metrics roll-up is secondary — ignore failures
  }
}

export async function syncYouTubeVideos(): Promise<SyncResult> {
  const KEY = process.env.YOUTUBE_API_KEY;
  const CH = process.env.YOUTUBE_CHANNEL_ID;
  if (!KEY || !CH) {
    return { synced: 0, error: 'YOUTUBE_API_KEY veya YOUTUBE_CHANNEL_ID eksik' };
  }

  try {
    // 1. channel -> uploads playlist id + subscriber count
    const chRes = await fetch(`${YT}/channels?part=contentDetails,statistics&id=${CH}&key=${KEY}`);
    const ch = await chRes.json();
    if (ch.error) return { synced: 0, error: ch.error.message || 'channels.list hatası' };
    const uploads: string | undefined =
      ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return { synced: 0, error: 'Uploads playlist bulunamadı' };
    const subscribers = Number(ch.items?.[0]?.statistics?.subscriberCount ?? 0);

    // 2. last N video ids (paginated, PAGE_SIZE per request)
    const ids: string[] = [];
    let pageToken = '';
    while (ids.length < MAX_VIDEOS) {
      const tokenParam = pageToken ? `&pageToken=${pageToken}` : '';
      const plRes = await fetch(
        `${YT}/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=${PAGE_SIZE}${tokenParam}&key=${KEY}`
      );
      const pl = await plRes.json();
      if (pl.error) return { synced: 0, error: pl.error.message || 'playlistItems.list hatası' };
      for (const i of pl.items ?? []) ids.push(i.contentDetails.videoId);
      if (!pl.nextPageToken || (pl.items ?? []).length === 0) break;
      pageToken = pl.nextPageToken;
    }
    const wanted = ids.slice(0, MAX_VIDEOS);
    if (wanted.length === 0) return { synced: 0 };

    // 3. video details, batched by PAGE_SIZE ids per call
    interface YtItem {
      id: string;
      snippet: {
        title: string;
        publishedAt: string;
        thumbnails?: Record<string, { url: string }>;
      };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails?: { duration?: string };
      liveStreamingDetails?: unknown;
    }

    const items: YtItem[] = [];
    for (let i = 0; i < wanted.length; i += PAGE_SIZE) {
      const chunk = wanted.slice(i, i + PAGE_SIZE);
      const vRes = await fetch(
        `${YT}/videos?part=snippet,statistics,contentDetails,liveStreamingDetails&id=${chunk.join(
          ','
        )}&key=${KEY}`
      );
      const v = await vRes.json();
      if (v.error) return { synced: 0, error: v.error.message || 'videos.list hatası' };
      for (const it of v.items ?? []) items.push(it as YtItem);
    }

    const rows = items.map((it: YtItem) => {
      const seconds = parseDuration(it.contentDetails?.duration);
      const isLive = Boolean(it.liveStreamingDetails);
      const thumb =
        it.snippet.thumbnails?.medium?.url ||
        it.snippet.thumbnails?.default?.url ||
        null;
      return {
        video_id: it.id,
        title: it.snippet.title,
        thumbnail_url: thumb,
        published_at: it.snippet.publishedAt,
        view_count: Number(it.statistics?.viewCount ?? 0),
        like_count: Number(it.statistics?.likeCount ?? 0),
        comment_count: Number(it.statistics?.commentCount ?? 0),
        content_type: classify(isLive, seconds),
        duration_seconds: seconds,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // 4. upsert in batches — claude_comment/commented_at omitted (preserved)
    const admin = createAdminClient();
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const { error } = await admin
        .from('video_performance')
        .upsert(rows.slice(i, i + UPSERT_BATCH), { onConflict: 'video_id' });
      if (error) return { synced: i, error: error.message };
    }

    // 5. roll up into the monthly Social Media metrics row (July 2026 onward).
    //    Types are mutually exclusive (video / short / live) so there is NO
    //    double counting — a finished live stream (VOD) stays 'live', never
    //    counted as a normal video. Manual fields (avg/peak live viewers) are
    //    intentionally left untouched.
    await rollUpMonthlyMetrics(admin, rows, subscribers);

    return { synced: rows.length };
  } catch (e) {
    return { synced: 0, error: e instanceof Error ? e.message : 'Bilinmeyen hata' };
  }
}
