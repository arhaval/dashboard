/**
 * Görsel Stüdyosu sunucu çizimi.
 *
 * Şablon, panel önizlemesindeki HTML'in AYNISIDIR. Burada başsız Chromium ile
 * 4x ölçekte çizilir, ardından zeminle birleştirilir (lib/gorsel/birlestir).
 *
 * - Vercel'de @sparticuz/chromium, yerelde Playwright'ın Chromium'u kullanılır.
 * - Sayfa sanal bir adresten açılır; bütün istekler `gorsel/` klasöründen
 *   karşılanır, dışarıya hiçbir ağ isteği çıkmaz (data: URL'ler hariç).
 * - Şablonun kendi denetimi (window.CHECK) uyarı verirse dosya teslim edilmez.
 */

import type { Browser } from 'playwright-core';
import {
  GORSEL_CIKTILAR,
  GORSEL_CIZIM_OLCEGI,
  GORSEL_FORMAT_YUKSEKLIK,
  GORSEL_SABLONLAR,
  GORSEL_SAYFA_GENISLIGI,
} from '@/constants/gorsel';
import type { GorselRenderIstek } from '@/lib/validations/gorsel';
import { birlestir } from '@/lib/gorsel/birlestir';
import { gorselVarlikService } from './gorsel-varlik.service';

const SANAL_KOK = 'https://gorsel.arhaval.local/';
const CIZIM_SURESI_MS = 30_000;

export type GorselRenderSonucu =
  | { ok: true; png: Buffer; dosyaAdi: string }
  | { ok: false; uyarilar: string[] };

let tarayiciSozu: Promise<Browser> | null = null;

/**
 * Linux sunucularda (Vercel dahil) @sparticuz/chromium; Windows/macOS'ta
 * Playwright'ın kurduğu Chromium (`pnpm exec playwright install chromium`)
 * ya da PLAYWRIGHT_CHROMIUM_PATH.
 */
async function tarayiciAc(): Promise<Browser> {
  if (process.platform === 'linux' && !process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    const [{ chromium }, sparticuz] = await Promise.all([import('playwright-core'), import('@sparticuz/chromium')]);
    const paket = sparticuz.default;
    return chromium.launch({ executablePath: await paket.executablePath(), args: paket.args, headless: true });
  }
  const { chromium } = await import('playwright-core');
  return chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
}

/** Sıcak fonksiyonda tarayıcı yeniden kullanılır; kopmuşsa yenisi açılır. */
async function tarayici(): Promise<Browser> {
  if (tarayiciSozu) {
    const b = await tarayiciSozu.catch(() => null);
    if (b?.isConnected()) return b;
  }
  tarayiciSozu = tarayiciAc();
  return tarayiciSozu;
}

function dosyaAdi(istek: GorselRenderIstek): string {
  const parca = (s: string) => s.normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const t = GORSEL_CIKTILAR[istek.cikti];
  return `${parca(istek.veri.takim.ad)}-${parca(istek.veri.rakip.ad)}-Mac-Gunu-${t.genislik}x${t.yukseklik}.png`;
}

export const gorselRenderService = {
  async render(istek: GorselRenderIstek): Promise<GorselRenderSonucu> {
    const tanim = GORSEL_CIKTILAR[istek.cikti];
    const veri = { ...istek.veri, format: tanim.format };
    const [zemin, b] = await Promise.all([gorselVarlikService.oku(tanim.zemin), tarayici()]);
    if (!zemin) throw new Error(`Zemin bulunamadı: ${tanim.zemin}`);

    const baglam = await b.newContext({
      viewport: { width: GORSEL_SAYFA_GENISLIGI, height: GORSEL_FORMAT_YUKSEKLIK[tanim.format] },
      deviceScaleFactor: GORSEL_CIZIM_OLCEGI,
    });
    try {
      await baglam.route('**/*', async (route) => {
        const url = route.request().url();
        if (!url.startsWith(SANAL_KOK)) return route.abort();
        const v = await gorselVarlikService.oku(decodeURIComponent(new URL(url).pathname));
        return v ? route.fulfill({ body: v.veri, contentType: v.icerikTuru }) : route.fulfill({ status: 404 });
      });
      await baglam.addInitScript((d) => { (window as unknown as { GORSEL_VERI: unknown }).GORSEL_VERI = d; }, veri);
      const sayfa = await baglam.newPage();
      await sayfa.goto(SANAL_KOK + GORSEL_SABLONLAR[istek.sablon].dosya);
      await sayfa.waitForFunction(() => document.title === 'ready', undefined, { timeout: CIZIM_SURESI_MS });
      const denetim = (await sayfa.evaluate(() => (window as unknown as { CHECK?: { uyarilar?: string[] } }).CHECK)) ?? {};
      const uyarilar = denetim.uyarilar ?? ['şablon denetimi okunamadı'];
      if (uyarilar.length > 0) return { ok: false, uyarilar };

      const katman = await sayfa.screenshot({ omitBackground: true, type: 'png' });
      const png = await birlestir(katman, zemin.veri, tanim.genislik, tanim.yukseklik);
      return { ok: true, png, dosyaAdi: dosyaAdi(istek) };
    } finally {
      await baglam.close();
    }
  },
};
