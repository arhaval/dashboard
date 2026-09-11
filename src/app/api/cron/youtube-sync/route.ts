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
import { monthsToRefresh } from '@/app/(dashboard)/social/month.utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  const result = await syncYouTubeVideos();

  // Aylık Analytics dolumu, video senkronu erken dönse bile çalışır. Veri 2-3 gün
  // gecikmeyle oturduğu için yeni ayın ilk günlerinde önceki ay da yeniden
  // çekilir; yoksa her kapanan ay son günlerini kalıcı olarak kaybeder.
  const months = monthsToRefresh();
  const analytics = await fillEach(
    months,
    (m) => youtubeAnalyticsService.fillMonth(m),
    'aylık Analytics dolumu başarısız'
  );
  if (!analytics.ok) console.error('[youtube-sync] aylık Analytics:', analytics.error);

  // Instagram: aynı pencere, aynı gecikme.
  const instagram = await fillEach(
    months,
    (m) => instagramService.fillMonth(m),
    'aylık Instagram dolumu başarısız'
  );
  if (!instagram.ok) console.error('[youtube-sync] aylık Instagram:', instagram.error);
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

/** Ayları sırayla doldurur; biri düşerse diğerleri yine denenir. */
async function fillEach(
  months: string[],
  fill: (month: string) => Promise<{ ok: boolean; error?: string }>,
  fallback: string
): Promise<{ ok: boolean; months: string[]; error?: string }> {
  const errors: string[] = [];
  for (const month of months) {
    const r = await fill(month).catch((e: unknown) => ({
      ok: false,
      error: e instanceof Error ? e.message : fallback,
    }));
    if (!r.ok) errors.push(`${month}: ${r.error ?? fallback}`);
  }
  return errors.length > 0 ? { ok: false, months, error: errors.join(' · ') } : { ok: true, months };
}
