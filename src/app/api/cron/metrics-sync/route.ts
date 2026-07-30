/**
 * Yayın metrik ölçümü (Vercel Cron) — 6 saatte bir.
 *
 * youtube-sync'ten AYRI bir uç nokta olmasının sebebi maliyet:
 * youtube-sync her çalıştığında bütün kanalı yeniden çeker (yüzlerce video,
 * tam upsert). Onu 6 saatte bire çıkarmak gereksiz yük olurdu.
 *
 * Burada yapılan iş yalnızca BAĞLI yayınların ölçümü: platform başına birkaç
 * API çağrısı, saniyeler süren bir iş. 24 saatlik ölçüm noktasının toleransı
 * 8 saat olduğu için bu noktanın kaçırılmaması ancak 6 saatlik bir ritimle
 * mümkün — günlük cron ile 24s noktalarının çoğu hiç oluşmaz.
 *
 * `force: false`: hangi yayının ölçüleceğine yaşam döngüsü karar verir.
 * İdempotenttir: aynı sayılarla ikinci kez çalışırsa yeni satır yazmaz.
 *
 * SESSİZ BAŞARI YOK: bir platformun iç işlemi düştüyse HTTP durumu ve gövdedeki
 * `outcome` bunu söyler. YouTube 23 gün boyunca bozuk kalıp kimsenin fark
 * etmemesinin sebebi tam olarak buydu.
 */

import { publicationMetricsService } from '@/services/publication-metrics.service';
import { integrationHealthService } from '@/services/integration-health.service';
import { denyCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  const at = new Date().toISOString();

  try {
    const metrics = await publicationMetricsService.syncAll({ force: false });
    const health = await integrationHealthService.getPlatformHealth();

    // Kısmi başarı 207, tam başarısızlık 500. İzleme araçları bunu görebilsin.
    const status = metrics.outcome === 'SUCCESS' ? 200 : metrics.outcome === 'PARTIAL_SUCCESS' ? 207 : 500;
    return Response.json({ ...metrics, health, at }, { status });
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Metrik ölçümü başarısız';
    console.error('[metrics-sync] beklenmeyen hata:', error);
    return Response.json({ outcome: 'FAILED', error, at }, { status: 500 });
  }
}
