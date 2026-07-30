/**
 * Daily YouTube sync (Vercel Cron).
 * Configured in vercel.json to run once a day. If CRON_SECRET is set, the
 * request must carry `Authorization: Bearer <CRON_SECRET>` (Vercel sends this).
 */

import { syncYouTubeVideos } from '@/services/youtube.service';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';
import { instagramService } from '@/services/instagram.service';
import { contentQueueService } from '@/services/content-queue.service';
import { publicationMetricsService } from '@/services/publication-metrics.service';
import { denyCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  const result = await syncYouTubeVideos();

  // Independent safety net: fill the current month's Analytics metrics even if
  // the video sync bailed early (e.g. video_performance table not yet created).
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const analytics = await youtubeAnalyticsService
    .fillMonth(month)
    .catch((e) => ({ ok: false, error: e instanceof Error ? e.message : 'aylık Analytics dolumu başarısız' }));
  if (!analytics.ok) console.error('[youtube-sync] aylık Analytics:', (analytics as { error?: string }).error);

  // Instagram: refresh token + current-month account metrics (followers + views).
  const instagram = await instagramService
    .fillMonth(month)
    .catch((e) => ({ ok: false, error: e instanceof Error ? e.message : 'aylık Instagram dolumu başarısız' }));
  if (!instagram.ok) console.error('[youtube-sync] aylık Instagram:', (instagram as { error?: string }).error);
  // Only refresh posts linked to published content (not a daily 60-post scan).
  const instagramMedia = await instagramService.syncLinkedMedia().catch(() => ({ refreshed: 0 }));

  // Now that the rows exist, push each published card's script onto them — a
  // freshly uploaded video has no row at publish time, so this is where content
  // published since the last run actually enters the library.
  const scripts = await contentQueueService.relinkPublishedScripts().catch(() => ({ linked: 0 }));

  // Yayın bazlı metrik snapshot'ları. force=false: yalnızca yaşam döngüsüne göre
  // zamanı gelen yayınlar ölçülür, bu yüzden günde bir çalışan cron kotayı
  // zorlamaz. Bu adım idempotenttir — aynı sayılarla ikinci kez çalışırsa yeni
  // satır yazmaz. Hatası diğer adımları düşürmemeli.
  const metrics = await publicationMetricsService
    .syncAll({ force: false })
    .catch((e) => ({ outcome: 'FAILED' as const, error: e instanceof Error ? e.message : 'metrik ölçümü başarısız' }));

  // Bir alt işlem düştüyse bunu başarı gibi göstermiyoruz.
  const failures = [
    result.error ? 'videoSync' : null,
    !analytics.ok ? 'monthlyAnalytics' : null,
    !instagram.ok ? 'monthlyInstagram' : null,
    (metrics as { outcome?: string }).outcome === 'FAILED' ? 'publicationMetrics' : null,
  ].filter(Boolean);
  const outcome = failures.length === 0 ? 'SUCCESS' : result.error ? 'FAILED' : 'PARTIAL_SUCCESS';
  const status = outcome === 'SUCCESS' ? 200 : outcome === 'PARTIAL_SUCCESS' ? 207 : 500;

  return Response.json(
    { outcome, failures, ...result, analytics, instagram, instagramMedia, scripts, metrics, at: new Date().toISOString() },
    { status }
  );
}
