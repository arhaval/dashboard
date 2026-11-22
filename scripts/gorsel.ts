/**
 * Görsel Stüdyosu komut satırı — panelle AYNI şablon ve AYNI çizim hattı.
 * Claude Code bu komutu kullanır (.claude/skills/gorsel-studyosu/SKILL.md).
 * Oturum ya da veritabanı gerekmez.
 *
 *   pnpm gorsel --liste
 *   pnpm gorsel mac-gunu --takim bbl --rakip sinners --turnuva "RUSH BRNO 2026 · YARI FİNAL" --saat 19.00
 *   pnpm gorsel mac-gunu --takim bbl --rakip-ad "TEAM X" --rakip-logo logo.png --turnuva "..." --saat 21.30 --yayin yok
 *
 * Seçenekler: --cikti post,post-hd,hikaye (varsayılan: post,hikaye)  --klasor gorsel-cikti
 * Şablon denetimi uyarı verirse dosya yazılmaz ve çıkış kodu 1 olur.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { GORSEL_CIKTILAR, GORSEL_RAKIPLER, GORSEL_TAKIMLAR, type GorselCikti } from '../src/constants/gorsel';
import { MAC_GUNU_BOS_FORM, RAKIP_YUKLE, macGunuVerisi } from '../src/lib/gorsel/mac-gunu';
import { gorselRenderIstekSchema } from '../src/lib/validations/gorsel';
import { gorselRenderService } from '../src/services/gorsel-render.service';

const LOGO_TURU: Record<string, string> = { '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

const yaz = (s: string) => process.stdout.write(s + '\n');
const hata = (s: string): never => { process.stderr.write(s + '\n'); process.exit(1); };

function liste() {
  yaz('Takımlar (kadro + fotoğraf hazır):');
  for (const [k, t] of Object.entries(GORSEL_TAKIMLAR)) yaz(`  ${k.padEnd(10)} ${t.ad} — ${(t.oyuncular ?? []).map((o) => o.nick).join(', ')}${t.hdFoto === false ? ' (HD yok)' : ''}`);
  yaz('Rakipler (logo hazır):');
  for (const [k, t] of Object.entries(GORSEL_RAKIPLER)) yaz(`  ${k.padEnd(10)} ${t.ad}`);
  yaz(`Çıktılar: ${Object.keys(GORSEL_CIKTILAR).join(', ')}`);
}

async function logoOku(dosya: string): Promise<string> {
  const tur = LOGO_TURU[path.extname(dosya).toLowerCase()];
  if (!tur) return hata('Rakip logosu PNG, SVG ya da WebP olmalı.');
  return `data:${tur};base64,${(await fs.readFile(dosya)).toString('base64')}`;
}

async function main() {
  const { values: a, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      liste: { type: 'boolean' }, takim: { type: 'string', default: 'bbl' }, rakip: { type: 'string' },
      'rakip-ad': { type: 'string' }, 'rakip-logo': { type: 'string' }, turnuva: { type: 'string' },
      saat: { type: 'string' }, yayin: { type: 'string', default: 'var' },
      cikti: { type: 'string', default: 'post,hikaye' }, klasor: { type: 'string', default: 'gorsel-cikti' },
    },
  });
  if (a.liste) return liste();
  if ((positionals[0] ?? 'mac-gunu') !== 'mac-gunu') return hata('Şimdilik tek şablon var: mac-gunu');
  if (a.yayin !== 'var' && a.yayin !== 'yok') return hata('--yayin var ya da yok olmalı.');

  const ciktilar = a.cikti.split(',').map((c) => c.trim()) as GorselCikti[];
  const bilinmeyen = ciktilar.filter((c) => !(c in GORSEL_CIKTILAR));
  if (bilinmeyen.length) return hata(`Bilinmeyen çıktı: ${bilinmeyen.join(', ')}`);

  const yuklenen = a['rakip-logo'] ? await logoOku(a['rakip-logo']) : null;
  const form = {
    ...MAC_GUNU_BOS_FORM,
    takim: a.takim,
    rakip: yuklenen ? RAKIP_YUKLE : (a.rakip ?? ''),
    rakipAd: a['rakip-ad'] ?? '',
    rakipLogo: yuklenen,
    turnuva: a.turnuva ?? '',
    saat: a.saat ?? '',
    yayin: a.yayin === 'var',
  };
  if (!GORSEL_TAKIMLAR[form.takim]) return hata(`Takım hazır değil: ${form.takim} (pnpm gorsel --liste)`);
  if (ciktilar.includes('post-hd') && GORSEL_TAKIMLAR[form.takim].hdFoto === false) {
    return hata(`${GORSEL_TAKIMLAR[form.takim].ad} fotoğrafları HD için yeterli değil; post-hd çıkarılamaz (post ve hikaye çıkar).`);
  }
  if (!yuklenen && !GORSEL_RAKIPLER[form.rakip]) return hata(`Rakip hazır değil: ${form.rakip || '(boş)'} — --rakip-logo ve --rakip-ad ver.`);

  await fs.mkdir(a.klasor, { recursive: true });
  let basarisiz = false;
  for (const cikti of ciktilar) {
    const donusum = macGunuVerisi({ ...form, format: GORSEL_CIKTILAR[cikti].format });
    if (!donusum.ok) return hata(`Eksik ya da hatalı bilgi:\n- ${donusum.hatalar.join('\n- ')}`);
    const t0 = Date.now();
    const sonuc = await gorselRenderService.render(gorselRenderIstekSchema.parse({ sablon: 'mac-gunu', cikti, veri: donusum.veri }));
    if (!sonuc.ok) {
      basarisiz = true;
      process.stderr.write(`${cikti}: teslim edilmedi\n- ${sonuc.uyarilar.join('\n- ')}\n`);
      continue;
    }
    const yol = path.resolve(a.klasor, sonuc.dosyaAdi);
    await fs.writeFile(yol, sonuc.png);
    yaz(`${yol}  (${Date.now() - t0} ms)`);
  }
  process.exit(basarisiz ? 1 : 0);
}

main().catch((e: unknown) => hata(e instanceof Error ? (e.stack ?? e.message) : String(e)));
