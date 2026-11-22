/**
 * GET /api/gorsel/varlik/<yol> — Görsel Stüdyosu varlıkları (şablon HTML'i,
 * font, zemin, logo, oyuncu fotoğrafı). Panel önizlemesindeki iframe bunları
 * buradan alır. Yalnızca Görsel Stüdyosu yetkisi olan kullanıcıya açıktır.
 */

import { gorselYetkisiniDogrula } from '@/lib/gorsel/yetki';
import { gorselVarlikService } from '@/services/gorsel-varlik.service';

export async function GET(_request: Request, { params }: { params: Promise<{ yol: string[] }> }) {
  const yetki = await gorselYetkisiniDogrula();
  if (!yetki.ok) return Response.json({ error: yetki.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: yetki.status });

  const { yol } = await params;
  const varlik = await gorselVarlikService.oku(yol.join('/'));
  if (!varlik) return Response.json({ error: 'Not found' }, { status: 404 });

  return new Response(new Uint8Array(varlik.veri), {
    headers: {
      'Content-Type': varlik.icerikTuru,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
