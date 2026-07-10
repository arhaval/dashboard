/**
 * Daily YouTube sync (Vercel Cron).
 * Configured in vercel.json to run once a day. If CRON_SECRET is set, the
 * request must carry `Authorization: Bearer <CRON_SECRET>` (Vercel sends this).
 */

import { syncYouTubeVideos } from '@/services/youtube.service';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';
import { instagramService } from '@/services/instagram.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const result = await syncYouTubeVideos();

  // Independent safety net: fill the current month's Analytics metrics even if
  // the video sync bailed early (e.g. video_performance table not yet created).
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const analytics = await youtubeAnalyticsService.fillMonth(month).catch(() => ({ ok: false }));

  // Instagram: refresh token + current-month account metrics (followers + views).
  const instagram = await instagramService.fillMonth(month).catch(() => ({ ok: false }));
  // Only refresh posts linked to published content (not a daily 60-post scan).
  const instagramMedia = await instagramService.syncLinkedMedia().catch(() => ({ refreshed: 0 }));

  const status = result.error ? 500 : 200;
  return Response.json(
    { ...result, analytics, instagram, instagramMedia, at: new Date().toISOString() },
    { status }
  );
}
