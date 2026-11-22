/**
 * Görsel Stüdyosu örnek çizimi: veritabanı ve oturum gerekmeden, sunucudaki
 * çizim hattının aynısıyla dosya üretir. Şablon değişikliklerini denemek için.
 *
 *   pnpm exec tsx scripts/gorsel-ornek.ts [post|post-hd|hikaye] [cikti-klasoru]
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { GORSEL_RAKIPLER, GORSEL_TAKIMLAR, type GorselCikti } from '../src/constants/gorsel';
import { gorselRenderIstekSchema } from '../src/lib/validations/gorsel';
import { gorselRenderService } from '../src/services/gorsel-render.service';

async function main() {
  const cikti = (process.argv[2] ?? 'post') as GorselCikti;
  const klasor = process.argv[3] ?? '.';
  const takim = GORSEL_TAKIMLAR.bbl, rakip = GORSEL_RAKIPLER.sinners;
  const istek = gorselRenderIstekSchema.parse({
    sablon: 'mac-gunu',
    cikti,
    veri: {
      format: cikti === 'hikaye' ? 'hikaye' : 'post',
      turnuva: 'RUSH BRNO 2026 · YARI FİNAL',
      saat: '19.00',
      yayin: process.env.YAYIN !== '0',
      takim: { ad: takim.ad, logo: takim.logo, oyuncular: takim.oyuncular },
      rakip: { ad: rakip.ad, logo: rakip.logo },
    },
  });
  const t0 = Date.now();
  const sonuc = await gorselRenderService.render(istek);
  if (!sonuc.ok) {
    process.stderr.write(`Teslim edilmedi:\n- ${sonuc.uyarilar.join('\n- ')}\n`);
    process.exit(1);
  }
  const yol = path.join(klasor, sonuc.dosyaAdi);
  await fs.writeFile(yol, sonuc.png);
  process.stdout.write(`${yol} (${Date.now() - t0} ms)\n`);
  process.exit(0);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(1);
});
