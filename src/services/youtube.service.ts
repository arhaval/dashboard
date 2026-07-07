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
const MAX_VIDEOS = 100; // how far back to pull; YouTube quota cost is negligible
const PAGE_SIZE = 50;   // playlistItems / videos.list max per request
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

export async function syncYouTubeVideos(): Promise<SyncResult> {
  const KEY = process.env.YOUTUBE_API_KEY;
  const CH = process.env.YOUTUBE_CHANNEL_ID;
  if (!KEY || !CH) {
    return { synced: 0, error: 'YOUTUBE_API_KEY veya YOUTUBE_CHANNEL_ID eksik' };
  }

  try {
    // 1. channel -> uploads playlist id
    const chRes = await fetch(`${YT}/channels?part=contentDetails&id=${CH}&key=${KEY}`);
    const ch = await chRes.json();
    if (ch.error) return { synced: 0, error: ch.error.message || 'channels.list hatası' };
    const uploads: string | undefined =
      ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return { synced: 0, error: 'Uploads playlist bulunamadı' };

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

    // 4. upsert — claude_comment/commented_at intentionally omitted (preserved)
    const admin = createAdminClient();
    const { error } = await admin
      .from('video_performance')
      .upsert(rows, { onConflict: 'video_id' });

    if (error) return { synced: 0, error: error.message };

    return { synced: rows.length };
  } catch (e) {
    return { synced: 0, error: e instanceof Error ? e.message : 'Bilinmeyen hata' };
  }
}
