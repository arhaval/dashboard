/**
 * POST /api/gorsel/render — şablonu sunucuda çizer, zeminle birleştirir ve PNG döner.
 *
 * Gövde: { sablon, cikti, veri } (lib/validations/gorsel). Şablonun kendi denetimi
 * uyarı verirse dosya teslim edilmez; 422 ile uyarılar döner.
 */

import { gorselYetkisiniDogrula } from '@/lib/gorsel/yetki';
import { gorselRenderIstekSchema } from '@/lib/validations/gorsel';
import { gorselRenderService } from '@/services/gorsel-render.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const yetki = await gorselYetkisiniDogrula();
  if (!yetki.ok) return Response.json({ error: yetki.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: yetki.status });

  const govde: unknown = await request.json().catch(() => null);
  const istek = gorselRenderIstekSchema.safeParse(govde);
  if (!istek.success) return Response.json({ error: istek.error.flatten() }, { status: 400 });

  try {
    const sonuc = await gorselRenderService.render(istek.data);
    if (!sonuc.ok) return Response.json({ uyarilar: sonuc.uyarilar }, { status: 422 });
    return new Response(new Uint8Array(sonuc.png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${sonuc.dosyaAdi}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : 'Bilinmeyen hata';
    return Response.json({ error: `Görsel üretilemedi: ${mesaj}` }, { status: 500 });
  }
}
