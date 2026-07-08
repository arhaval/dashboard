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
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';
import {
  classifyVideoGenre,
  type ContentType,
  type VideoGenre,
} from '@/app/(dashboard)/icerik-performansi/perf.constants';

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

/**
 * Update the current month's YouTube row in social_monthly_metrics.
 *  - subscribers_total: current cumulative count (from the Data API).
 *  - per-month video/shorts/live views + likes + comments: pulled from the
 *    YouTube Analytics API (true "o ay içinde" numbers, split by content type,
 *    no double counting) when the channel is connected.
 * Manual fields (avg/peak live viewers) are never touched. Non-fatal.
 */
async function rollUpMonthlyMetrics(
  admin: ReturnType<typeof createAdminClient>,
  subscribers: number
): Promise<void> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (month < '2026-07') return; // only from July 2026 onward

  // 1. subscribers_total (cumulative) — preserve every other column
  try {
    const sub = { subscribers_total: subscribers, updated_at: new Date().toISOString() };
    const { data: existing } = await admin
      .from('social_monthly_metrics')
      .select('id')
      .eq('month', month)
      .eq('platform', 'YOUTUBE')
      .maybeSingle();
    if (existing) {
      await admin.from('social_monthly_metrics').update(sub).eq('id', existing.id);
    } else {
      await admin
        .from('social_monthly_metrics')
        .insert({ month, platform: 'YOUTUBE', followers_total: 0, ...sub });
    }
  } catch {
    // secondary — ignore
  }

  // 2. per-month views/likes/comments from Analytics API (no-op if not connected)
  try {
    await youtubeAnalyticsService.fillMonth(month);
  } catch {
    // Analytics not connected or transient failure — ignore
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

    // 4b. Auto-assign genre for rows that are NOT manually locked. Group video
    //     ids by their classified genre and update in one query per genre.
    //     genre_locked=true rows (manual overrides) are preserved.
    const idsByGenre = new Map<VideoGenre, string[]>();
    for (const r of rows) {
      const g = classifyVideoGenre(r.title, r.content_type as ContentType);
      const arr = idsByGenre.get(g) ?? [];
      arr.push(r.video_id);
      idsByGenre.set(g, arr);
    }
    for (const [genre, ids] of idsByGenre) {
      await admin
        .from('video_performance')
        .update({ genre })
        .in('video_id', ids)
        .eq('genre_locked', false);
    }

    // 5. roll up into the monthly Social Media metrics row (July 2026 onward).
    //    Types are mutually exclusive (video / short / live) so there is NO
    //    double counting — a finished live stream (VOD) stays 'live', never
    //    counted as a normal video. Manual fields (avg/peak live viewers) are
    //    intentionally left untouched.
    await rollUpMonthlyMetrics(admin, subscribers);

    return { synced: rows.length };
  } catch (e) {
    return { synced: 0, error: e instanceof Error ? e.message : 'Bilinmeyen hata' };
  }
}
