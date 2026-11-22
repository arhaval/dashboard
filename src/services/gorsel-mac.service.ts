/**
 * Görsel Stüdyosu ↔ arhaval.com maç verisi.
 *
 * Ekip panelde yaklaşan maçları görür, paylaşacağı maçı SEÇER; seçilen maçın
 * postu bu servisle kendiliğinden doldurulur (rakip, logo, Türkiye saati,
 * turnuva satırı, yayın). Her maç paylaşılmaz; seçim ekipte.
 */

import {
  GORSEL_ARHAVAL_COM_URL,
  GORSEL_LOGO_AZAMI_URL,
  GORSEL_MAC_PENCERESI_SAAT,
} from '@/constants/gorsel';
import {
  arhavalMacListesiSchema,
  macFormu,
  macOzeti,
  type ArhavalMac,
  type GorselMacOzeti,
} from '@/lib/gorsel/arhaval-mac';
import type { MacGunuForm } from '@/lib/gorsel/mac-gunu';

const KIMLIK = 'ArhavalPanel/1.0 (+https://yonetim.arhaval.com)';
const ZAMAN_ASIMI_MS = 10_000;
const LOGO_AZAMI_BAYT = 2 * 1024 * 1024;

async function maclariOku(): Promise<ArhavalMac[]> {
  const yanit = await fetch(`${GORSEL_ARHAVAL_COM_URL}/api/gorsel/yaklasan-maclar?saat=${GORSEL_MAC_PENCERESI_SAAT}`, {
    headers: { 'User-Agent': KIMLIK, Accept: 'application/json' },
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    next: { revalidate: 300 },
  });
  if (!yanit.ok) throw new Error(`arhaval.com maç listesi alınamadı (HTTP ${yanit.status})`);
  return arhavalMacListesiSchema.parse(await yanit.json()).maclar;
}

/** Logoyu indirip şablonun kabul ettiği data URL'ye çevirir (PNG, SVG, WebP; diğerleri PNG'ye). */
async function logoIndir(adres: string): Promise<string | null> {
  try {
    const url = new URL(adres);
    if (url.protocol !== 'https:') return null;
    const yanit = await fetch(url, { headers: { 'User-Agent': KIMLIK }, signal: AbortSignal.timeout(ZAMAN_ASIMI_MS) });
    if (!yanit.ok) return null;
    const veri = Buffer.from(await yanit.arrayBuffer());
    if (veri.length === 0 || veri.length > LOGO_AZAMI_BAYT) return null;
    const tur = (yanit.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    let dataUrl: string;
    if (tur === 'image/svg+xml' || tur === 'image/png' || tur === 'image/webp') {
      dataUrl = `data:${tur};base64,${veri.toString('base64')}`;
    } else if (tur.startsWith('image/')) {
      const { default: sharp } = await import('sharp');
      dataUrl = `data:image/png;base64,${(await sharp(veri).png().toBuffer()).toString('base64')}`;
    } else {
      return null;
    }
    return dataUrl.length <= GORSEL_LOGO_AZAMI_URL ? dataUrl : null;
  } catch {
    return null;
  }
}

export type GorselMacFormSonucu =
  | { ok: true; form: MacGunuForm; notlar: string[] }
  | { ok: false; hata: string };

export const gorselMacService = {
  /** Panelde listelenecek yaklaşan maçlar. arhaval.com'a ulaşılamazsa liste boş, hata dolu döner. */
  async yaklasanlar(): Promise<{ maclar: GorselMacOzeti[]; hata: string | null }> {
    try {
      return { maclar: (await maclariOku()).map(macOzeti), hata: null };
    } catch (e) {
      return { maclar: [], hata: e instanceof Error ? e.message : 'arhaval.com maç listesi alınamadı' };
    }
  },

  /** Seçilen maçın formu: her şey dolu gelir, kişi önizlemede kontrol edip indirir. */
  async form(macId: string): Promise<GorselMacFormSonucu> {
    const mac = (await maclariOku()).find((m) => m.id === macId);
    if (!mac) return { ok: false, hata: 'Maç artık listede değil (başlamış, ertelenmiş ya da iptal olmuş olabilir).' };
    const ozet = macOzeti(mac);
    if (ozet.engeller.length > 0) return { ok: false, hata: ozet.engeller.join(' · ') };

    const { rakipLogoUrl, ...form } = macFormu(mac);
    const notlar = [...ozet.notlar];
    if (rakipLogoUrl) {
      form.rakipLogo = await logoIndir(rakipLogoUrl);
      if (!form.rakipLogo) notlar.push(`${mac.rakip.ad} logosu indirilemedi, formdan yükle`);
    }
    return { ok: true, form, notlar };
  },
};
