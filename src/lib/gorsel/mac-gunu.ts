/**
 * Maç günü formu → şablon verisi. Saf fonksiyon: panel formu da ileride
 * HLTV'den otomatik doldurma da aynı dönüşümü kullanır.
 */

import { GORSEL_RAKIPLER, GORSEL_TAKIMLAR, type GorselFormat } from '@/constants/gorsel';
import { macGunuVeriSchema, type MacGunuVeri } from '@/lib/validations/gorsel';

/** Rakip listede yoksa logo formdan yüklenir. */
export const RAKIP_YUKLE = 'yukle';

export interface MacGunuForm {
  takim: string;
  rakip: string;
  rakipAd: string;
  rakipLogo: string | null;
  turnuva: string;
  saat: string;
  /** KURAL: maçı Arhaval yayınlamıyorsa false; yayın satırı hiç konmaz. */
  yayin: boolean;
  format: GorselFormat;
}

export const MAC_GUNU_BOS_FORM: MacGunuForm = {
  takim: 'bbl',
  rakip: 'sinners',
  rakipAd: '',
  rakipLogo: null,
  turnuva: '',
  saat: '',
  yayin: true,
  format: 'post',
};

export type MacGunuDonusum = { ok: true; veri: MacGunuVeri } | { ok: false; hatalar: string[] };

export function macGunuVerisi(form: MacGunuForm): MacGunuDonusum {
  const takim = GORSEL_TAKIMLAR[form.takim];
  const hazirRakip = form.rakip === RAKIP_YUKLE ? null : GORSEL_RAKIPLER[form.rakip];
  const sonuc = macGunuVeriSchema.safeParse({
    format: form.format,
    turnuva: form.turnuva,
    saat: form.saat,
    yayin: form.yayin,
    takim: takim ? { ad: takim.ad, logo: takim.logo, oyuncular: takim.oyuncular ?? [] } : undefined,
    rakip: hazirRakip
      ? { ad: hazirRakip.ad, logo: hazirRakip.logo }
      : { ad: form.rakipAd, logo: form.rakipLogo ?? '' },
  });
  if (sonuc.success) return { ok: true, veri: sonuc.data };
  return { ok: false, hatalar: [...new Set(sonuc.error.issues.map((i) => i.message))] };
}
