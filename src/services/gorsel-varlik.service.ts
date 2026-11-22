/**
 * Görsel Stüdyosu varlıkları (şablon, font, zemin, logo, oyuncu fotoğrafı).
 *
 * Varlıklar repodaki `gorsel/` klasöründe durur ve deploy'a
 * `outputFileTracingIncludes` ile girer (next.config.ts). Buradaki tek iş,
 * istenen yolu bu klasörün DIŞINA çıkamayacak şekilde çözüp okumaktır;
 * hem panel önizlemesi (/api/gorsel/varlik) hem sunucu çizimi bunu kullanır.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const KOK = path.join(process.cwd(), 'gorsel');

const ICERIK_TURU: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export interface GorselVarlik {
  veri: Buffer;
  icerikTuru: string;
}

/** Göreli yolu mutlak yola çevirir; kök dışına çıkan, gizli ya da bilinmeyen uzantılı yolları reddeder. */
function coz(goreli: string): string | null {
  const temiz = goreli.replace(/^\/+/, '');
  if (!temiz || temiz.split('/').some((p) => p === '' || p === '..' || p.startsWith('.'))) return null;
  if (!(path.extname(temiz).toLowerCase() in ICERIK_TURU)) return null;
  const mutlak = path.resolve(KOK, temiz);
  return mutlak.startsWith(KOK + path.sep) ? mutlak : null;
}

export const gorselVarlikService = {
  kok: KOK,

  async oku(goreli: string): Promise<GorselVarlik | null> {
    const mutlak = coz(goreli);
    if (!mutlak) return null;
    try {
      const veri = await fs.readFile(mutlak);
      return { veri, icerikTuru: ICERIK_TURU[path.extname(mutlak).toLowerCase()] };
    } catch {
      return null;
    }
  },
};
