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

import type { Browser, BrowserContext } from 'playwright-core';
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
const GPU_BAYRAGI = /^--(use-gl|use-angle|enable-unsafe-swiftshader|in-process-gpu|ignore-gpu-blocklist)/;
const CIZIM_SURESI_MS = 30_000;

export type GorselRenderSonucu =
  | { ok: true; png: Buffer; dosyaAdi: string }
  | { ok: false; uyarilar: string[] };

interface Tarayici {
  tarayici: Browser;
  /** Tek bağlam: Chromium --single-process modunda birden fazla bağlamla kararsız. */
  baglam: BrowserContext;
}

let tarayiciSozu: Promise<Tarayici> | null = null;

/**
 * Linux sunucularda (Vercel dahil) @sparticuz/chromium; Windows/macOS'ta
 * Playwright'ın kurduğu Chromium (`pnpm gorsel:tarayici`) ya da PLAYWRIGHT_CHROMIUM_PATH.
 */
async function tarayiciBaslat(): Promise<Browser> {
  const { chromium } = await import('playwright-core');
  if (process.platform === 'linux' && !process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    const paket = (await import('@sparticuz/chromium')).default;
    // SwiftShader (yazılımla GPU taklidi) yerine doğrudan yazılım çizimi: ~%25 daha az bellek,
    // daha hızlı; çıktı gözle ayırt edilemiyor. Sunucu fonksiyonunun 1 GB sınırı için gerekli.
    const args = [...paket.args.filter((a) => !GPU_BAYRAGI.test(a)), '--disable-gpu'];
    return chromium.launch({ executablePath: await paket.executablePath(), args, headless: true });
  }
  return chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
}

async function tarayiciAc(): Promise<Tarayici> {
  const tarayici = await tarayiciBaslat();
  const baglam = await tarayici.newContext({ deviceScaleFactor: GORSEL_CIZIM_OLCEGI });
  // --single-process modunda son sayfa kapanınca Chromium da kapanıyor; ikinci çizim
  // "browser has been closed" ile düşüyordu. Boş bir sayfa tarayıcıyı ayakta tutar.
  await baglam.newPage();
  return { tarayici, baglam };
}

/** Sıcak fonksiyonda tarayıcı yeniden kullanılır; kopmuşsa yenisi açılır. */
async function tarayici(): Promise<Tarayici> {
  if (tarayiciSozu) {
    const t = await tarayiciSozu.catch(() => null);
    if (t?.tarayici.isConnected()) return t;
  }
  tarayiciSozu = tarayiciAc();
  return tarayiciSozu;
}

function dosyaAdi(istek: GorselRenderIstek): string {
  const parca = (s: string) => s.normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const t = GORSEL_CIKTILAR[istek.cikti];
  return `${parca(istek.veri.takim.ad)}-${parca(istek.veri.rakip.ad)}-Mac-Gunu-${t.genislik}x${t.yukseklik}.png`;
}

/** Tarayıcı çizim sırasında düşerse (sıcak fonksiyonda nadiren) bir kez yeni tarayıcıyla denenir. */
function tarayiciDustu(e: unknown): boolean {
  return e instanceof Error && /has been closed|Target crashed|Browser closed|disconnected/i.test(e.message);
}

export const gorselRenderService = {
  async render(istek: GorselRenderIstek): Promise<GorselRenderSonucu> {
    try {
      return await this.ciz(istek);
    } catch (e) {
      if (!tarayiciDustu(e)) throw e;
      tarayiciSozu = null;
      return this.ciz(istek);
    }
  },

  async ciz(istek: GorselRenderIstek): Promise<GorselRenderSonucu> {
    const tanim = GORSEL_CIKTILAR[istek.cikti];
    const veri = { ...istek.veri, format: tanim.format };
    const [zemin, { baglam }] = await Promise.all([gorselVarlikService.oku(tanim.zemin), tarayici()]);
    if (!zemin) throw new Error(`Zemin bulunamadı: ${tanim.zemin}`);

    let katman: Buffer;
    const sayfa = await baglam.newPage();
    try {
      await sayfa.setViewportSize({ width: GORSEL_SAYFA_GENISLIGI, height: GORSEL_FORMAT_YUKSEKLIK[tanim.format] });
      await sayfa.route('**/*', async (route) => {
        const url = route.request().url();
        if (!url.startsWith(SANAL_KOK)) return route.abort();
        const v = await gorselVarlikService.oku(decodeURIComponent(new URL(url).pathname));
        return v ? route.fulfill({ body: v.veri, contentType: v.icerikTuru }) : route.fulfill({ status: 404 });
      });
      await sayfa.addInitScript((d) => { (window as unknown as { GORSEL_VERI: unknown }).GORSEL_VERI = d; }, veri);
      await sayfa.goto(SANAL_KOK + GORSEL_SABLONLAR[istek.sablon].dosya);
      await sayfa.waitForFunction(() => document.title === 'ready', undefined, { timeout: CIZIM_SURESI_MS });
      const denetim = (await sayfa.evaluate(() => (window as unknown as { CHECK?: { uyarilar?: string[] } }).CHECK)) ?? {};
      const uyarilar = denetim.uyarilar ?? ['şablon denetimi okunamadı'];
      if (uyarilar.length > 0) return { ok: false, uyarilar };

      katman = await sayfa.screenshot({ omitBackground: true, type: 'png' });
    } finally {
      // Birleştirmeden önce kapat: sayfanın belleği Chromium'da boşa dursun istemiyoruz.
      await sayfa.close();
    }
    const png = await birlestir(katman, zemin.veri, tanim.genislik, tanim.yukseklik);
    return { ok: true, png, dosyaAdi: dosyaAdi(istek) };
  },
};
