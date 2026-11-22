/**
 * arhaval.com yaklaşan maç listesi → Görsel Stüdyosu formu.
 *
 * Saf fonksiyonlar: veri doğrulaması, takım eşleştirme, Türkiye saati, turnuva satırı,
 * yayın kuralı, kadro kontrolü. Ağ ve logo indirme servis katmanında
 * (services/gorsel-mac.service.ts).
 */

import { z } from 'zod';
import {
  GORSEL_ARHAVAL_KANALI,
  GORSEL_RAKIPLER,
  GORSEL_TAKIMLAR,
  GORSEL_TURNUVA_ADLARI,
} from '@/constants/gorsel';
import { MAC_GUNU_BOS_FORM, RAKIP_YUKLE, type MacGunuForm } from './mac-gunu';

export const arhavalMacSchema = z.object({
  id: z.string(),
  takim: z.object({
    ad: z.string(),
    slug: z.string().nullable(),
    oyuncular: z.array(z.object({ nick: z.string() })),
  }),
  rakip: z.object({ ad: z.string(), logoUrl: z.string().nullable() }),
  baslangic: z.string().nullable(),
  saatKesin: z.boolean(),
  turnuva: z.string().nullable(),
  asama: z.string().nullable(),
  asamaHam: z.string().nullable(),
  yayinlar: z.array(z.object({ platform: z.string(), channel: z.string(), url: z.string() })),
});
export const arhavalMacListesiSchema = z.object({ maclar: z.array(arhavalMacSchema) });
export type ArhavalMac = z.infer<typeof arhavalMacSchema>;

/** Panelde listelenen maç: özet + hazırlık durumu. */
export interface GorselMacOzeti {
  id: string;
  takimAd: string;
  rakipAd: string;
  baslangic: string | null;
  saat: string | null;
  turnuvaSatiri: string;
  /** Bunlar varken post hazırlanamaz (takımın kadro fotoğrafları yok). */
  engeller: string[];
  /** Post hazırlanır ama kişi bakmalı. */
  notlar: string[];
}

const anahtar = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function eslesen<T extends { eslesme?: string[]; ad: string }>(liste: Record<string, T>, ad: string, slug?: string | null): string | null {
  const adlar = [anahtar(ad), anahtar(slug)].filter(Boolean);
  for (const [k, t] of Object.entries(liste)) {
    const kabul = [anahtar(t.ad), ...(t.eslesme ?? [])];
    if (adlar.some((a) => kabul.includes(a))) return k;
  }
  return null;
}

/** Listede gösterilen gün: "Bugün", "Yarın" ya da "24 Kas Pzt" (Türkiye saatiyle). */
export function gunEtiketi(iso: string, simdi: Date = new Date()): string {
  const gun = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(d);
  const fark = Math.round((Date.parse(gun(new Date(iso))) - Date.parse(gun(simdi))) / 86_400_000);
  if (fark === 0) return 'Bugün';
  if (fark === 1) return 'Yarın';
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', weekday: 'short' }).format(new Date(iso));
}

/** Türkiye saati, postta yazıldığı gibi: 19.00 */
export function turkiyeSaati(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(iso))
    .replace(':', '.');
}

/**
 * Turnuva adı yabancı özel isimdir: İngilizce büyük harf (noktasız I). Arhaval'ın kendi yazımı
 * olan turnuvalarda (GORSEL_TURNUVA_ADLARI) o yazılır, "Stage 1" gibi aşama eki korunur.
 * Aşama Türkçedir: Türkçe büyük harf (YARI FİNAL). Ayırıcı " · ".
 */
export function turnuvaAdi(turnuva: string | null): string {
  const ham = (turnuva ?? '').trim();
  const kural = GORSEL_TURNUVA_ADLARI.find((k) => k.desen.test(ham));
  if (!kural) return ham.toLocaleUpperCase('en-US');
  const asama = ham.match(/\bstage\s*\d+\b/i)?.[0];
  return [kural.ad, asama?.toLocaleUpperCase('en-US').replace(/\s+/g, ' ')].filter(Boolean).join(' ');
}

const YABANCI_TERIM = /^(swiss|play-in|playoffs?)$/i;

export function turnuvaSatiri(turnuva: string | null, asama: string | null): string {
  const t = turnuvaAdi(turnuva);
  // Aşama Türkçe büyük harf; içindeki İngilizce terimler (Swiss, Play-in) noktasız I ile kalır.
  const a = (asama ?? '').trim().split(/(\s+)/)
    .map((s) => (YABANCI_TERIM.test(s) ? s.toLocaleUpperCase('en-US') : s.toLocaleUpperCase('tr-TR')))
    .join('');
  return [t, a].filter(Boolean).join(' · ');
}

export function arhavalYayinliyor(mac: ArhavalMac): boolean {
  return mac.yayinlar.some((y) => GORSEL_ARHAVAL_KANALI.test(y.channel) || GORSEL_ARHAVAL_KANALI.test(y.url));
}

export function macOzeti(mac: ArhavalMac): GorselMacOzeti {
  const engeller: string[] = [];
  const notlar: string[] = [];
  const takimKey = eslesen(GORSEL_TAKIMLAR, mac.takim.ad, mac.takim.slug);
  const takim = takimKey ? GORSEL_TAKIMLAR[takimKey] : null;

  if (!takim?.oyuncular?.length) {
    engeller.push(`${mac.takim.ad} kadro fotoğrafları sisteme eklenmemiş`);
  } else {
    const bizde = new Set(takim.oyuncular.map((o) => o.nick.toLowerCase()));
    const kadro = new Set(mac.takim.oyuncular.map((o) => o.nick.toLowerCase()));
    const kadrodaYok = takim.oyuncular.filter((o) => !kadro.has(o.nick.toLowerCase())).map((o) => o.nick);
    const fotografiYok = mac.takim.oyuncular.filter((o) => !bizde.has(o.nick.toLowerCase())).map((o) => o.nick);
    if (kadrodaYok.length) notlar.push(`HLTV kadrosunda görünmüyor: ${kadrodaYok.join(', ')}. Hâlâ takımda mı kontrol et`);
    if (fotografiYok.length) notlar.push(`Kadroda var ama fotoğrafı yok: ${fotografiYok.join(', ')}. Yedek mi kontrol et`);
  }
  if (!mac.baslangic) notlar.push('Maç saati belli değil, elle yaz');
  else if (!mac.saatKesin) notlar.push('Saat HLTV liste sayfasından geldi, maç sayfasında doğrula');
  if (!mac.turnuva) notlar.push('Turnuva adı yok, elle yaz');
  if (!mac.asama) notlar.push(mac.asamaHam ? `Aşama Türkçeye çevrilemedi ("${mac.asamaHam}"), turnuva satırını elle tamamla` : 'Aşama bilgisi yok, gerekiyorsa elle ekle');
  if (!eslesen(GORSEL_RAKIPLER, mac.rakip.ad) && !mac.rakip.logoUrl) notlar.push(`${mac.rakip.ad} logosu yok, formdan yükle`);
  if (!arhavalYayinliyor(mac)) notlar.push('Maçın yayıncılarında Arhaval yok, yayın satırı konmayacak');

  return {
    id: mac.id,
    takimAd: mac.takim.ad,
    rakipAd: mac.rakip.ad,
    baslangic: mac.baslangic,
    saat: mac.baslangic ? turkiyeSaati(mac.baslangic) : null,
    turnuvaSatiri: turnuvaSatiri(mac.turnuva, mac.asama),
    engeller,
    notlar,
  };
}

/** Formun maçtan gelen kısmı. Rakip logosu hazır listede yoksa servis indirip `rakipLogo`ya koyar. */
export function macFormu(mac: ArhavalMac): MacGunuForm & { rakipLogoUrl: string | null } {
  const takim = eslesen(GORSEL_TAKIMLAR, mac.takim.ad, mac.takim.slug) ?? MAC_GUNU_BOS_FORM.takim;
  const hazirRakip = eslesen(GORSEL_RAKIPLER, mac.rakip.ad);
  return {
    ...MAC_GUNU_BOS_FORM,
    takim,
    rakip: hazirRakip ?? RAKIP_YUKLE,
    rakipAd: mac.rakip.ad,
    rakipLogo: null,
    rakipLogoUrl: hazirRakip ? null : mac.rakip.logoUrl,
    turnuva: turnuvaSatiri(mac.turnuva, mac.asama),
    saat: mac.baslangic ? turkiyeSaati(mac.baslangic) : '',
    yayin: arhavalYayinliyor(mac),
  };
}
