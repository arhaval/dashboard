/**
 * Görsel Stüdyosu ↔ arhaval.com maç verisi. TARAYICIDA çalışır.
 *
 * Ekip panelde yaklaşan maçları görür, paylaşacağı maçı SEÇER; seçilen maçın
 * formu bu servisle dolar (rakip, logo, Türkiye saati, turnuva satırı, yayın).
 * Her maç paylaşılmaz; seçim ekipte.
 *
 * Neden tarayıcı: arhaval.com'un Vercel Firewall'u (bot koruması) panelin
 * sunucusundan gelen isteği 429 ile kesiyor; tarayıcı isteği geçiyor. Uç CORS'a
 * açık (veri /fikstur'da zaten herkese açık). Dosyayı yine sunucu çizer ve
 * /api/gorsel/render bütün veriyi şemayla yeniden doğrular.
 */

import {
  GORSEL_ARHAVAL_COM_URL,
  GORSEL_LOGO_AZAMI_BAYT,
  GORSEL_LOGO_AZAMI_URL,
  GORSEL_LOGO_KAYNAKLARI,
  GORSEL_MAC_PENCERESI_SAAT,
} from '@/constants/gorsel';
import { arhavalMacListesiSchema, macFormu, macOzeti, type ArhavalMac } from '@/lib/gorsel/arhaval-mac';
import type { MacGunuForm } from '@/lib/gorsel/mac-gunu';

const ZAMAN_ASIMI_MS = 10_000;
const DOGRUDAN_TUR = ['image/png', 'image/svg+xml', 'image/webp'];

export type GorselMacFormSonucu =
  | { ok: true; form: MacGunuForm; notlar: string[] }
  | { ok: false; hata: string };

/** Logo adresi izinli bir kaynaktan mı (yalnız https, yalnız arhaval.com'un logo kaynakları). */
export function logoKaynagiGecerli(adres: string): boolean {
  try {
    const url = new URL(adres);
    return url.protocol === 'https:' && GORSEL_LOGO_KAYNAKLARI.some((d) => d.test(url.hostname));
  } catch {
    return false;
  }
}

function dataUrlOku(blob: Blob): Promise<string> {
  return new Promise((coz, reddet) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => (typeof okuyucu.result === 'string' ? coz(okuyucu.result) : reddet(new Error('okunamadı')));
    okuyucu.onerror = () => reddet(new Error('okunamadı'));
    okuyucu.readAsDataURL(blob);
  });
}

/** JPEG gibi türleri şablonun kabul ettiği PNG'ye çevirir. */
async function pngYap(blob: Blob): Promise<string> {
  const resim = await createImageBitmap(blob);
  const tuval = document.createElement('canvas');
  tuval.width = resim.width;
  tuval.height = resim.height;
  tuval.getContext('2d')?.drawImage(resim, 0, 0);
  resim.close();
  return tuval.toDataURL('image/png');
}

/** Logoyu indirip şablonun kabul ettiği data URL'ye çevirir (PNG, SVG, WebP; diğerleri PNG'ye). */
async function logoIndir(adres: string): Promise<string | null> {
  if (!logoKaynagiGecerli(adres)) return null;
  try {
    const yanit = await fetch(adres, { signal: AbortSignal.timeout(ZAMAN_ASIMI_MS) });
    if (!yanit.ok) return null;
    const blob = await yanit.blob();
    if (blob.size === 0 || blob.size > GORSEL_LOGO_AZAMI_BAYT || !blob.type.startsWith('image/')) return null;
    const dataUrl = DOGRUDAN_TUR.includes(blob.type) ? await dataUrlOku(blob) : await pngYap(blob);
    return dataUrl.length <= GORSEL_LOGO_AZAMI_URL ? dataUrl : null;
  } catch {
    return null;
  }
}

export const gorselMacService = {
  /** Önümüzdeki saatlerdeki Türk takımı maçları (arhaval.com). */
  async yaklasanlar(): Promise<ArhavalMac[]> {
    const yanit = await fetch(`${GORSEL_ARHAVAL_COM_URL}/api/gorsel/yaklasan-maclar?saat=${GORSEL_MAC_PENCERESI_SAAT}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    });
    if (!yanit.ok) throw new Error(`arhaval.com maç listesi alınamadı (HTTP ${yanit.status})`);
    return arhavalMacListesiSchema.parse(await yanit.json()).maclar;
  },

  /** Seçilen maçın formu: her şey dolu gelir, kişi önizlemede kontrol edip indirir. */
  async form(mac: ArhavalMac): Promise<GorselMacFormSonucu> {
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
