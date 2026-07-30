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
 * `force: false`: hangi yayının ölçüleceğine yaşam döngüsü karar verir
 * (0–2 gün 6 saatte bir, 2–7 gün günlük, 8–30 gün 2 günde bir, sonrası
 * haftalık). Yani 6 saatlik ritim yalnızca YENİ içerikler için maliyet yaratır.
 *
 * İdempotenttir: aynı sayılarla ikinci kez çalışırsa yeni satır yazmaz.
 */

import { publicationMetricsService } from '@/services/publication-metrics.service';
import { denyCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  try {
    const metrics = await publicationMetricsService.syncAll({ force: false });
    // Bir platformun hatası diğerini geçersiz kılmaz — ikisi de raporlanır.
    return Response.json({ ...metrics, at: new Date().toISOString() });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Metrik ölçümü başarısız', at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
