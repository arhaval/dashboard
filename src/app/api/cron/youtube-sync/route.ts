/**
 * Daily YouTube sync (Vercel Cron).
 * Configured in vercel.json to run once a day. If CRON_SECRET is set, the
 * request must carry `Authorization: Bearer <CRON_SECRET>` (Vercel sends this).
 */

import { syncYouTubeVideos } from '@/services/youtube.service';

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
  const status = result.error ? 500 : 200;
  return Response.json({ ...result, at: new Date().toISOString() }, { status });
}
