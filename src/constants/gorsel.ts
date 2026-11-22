/**
 * Görsel Stüdyosu sabitleri.
 *
 * Şablonlar ve varlıkları (font, zemin, logo, oyuncu fotoğrafı) repodaki
 * `gorsel/` klasöründe durur; bu klasör sunucuya özeldir, `public/` altında
 * değildir. Panelde yalnızca yetkili kullanıcıya /api/gorsel/varlik üzerinden
 * açılır. Kurallar ve yeni şablon ekleme: gorsel/BENIOKU.md.
 */

/** Varlık köküne göre yol: "takimlar/bbl/logo.png" gibi. */
export type GorselVarlikYolu = string;

export type GorselSablon = 'mac-gunu';
export type GorselCikti = 'post' | 'post-hd' | 'hikaye';
export type GorselFormat = 'post' | 'hikaye';

export interface GorselCiktiTanimi {
  etiket: string;
  format: GorselFormat;
  /** Teslim edilen dosyanın boyutu. */
  genislik: number;
  yukseklik: number;
  /** Petrol mesh zemini, teslim boyutunda. */
  zemin: GorselVarlikYolu;
}

/** Sayfa 1080 px genişlikte çizilir; çıktılar 4x çizimden küçültülerek üretilir. */
export const GORSEL_SAYFA_GENISLIGI = 1080;
export const GORSEL_CIZIM_OLCEGI = 4;

export const GORSEL_CIKTILAR: Record<GorselCikti, GorselCiktiTanimi> = {
  post:      { etiket: 'Post 1080×1440',    format: 'post',   genislik: 1080, yukseklik: 1440, zemin: 'ortak/zemin/post.png' },
  'post-hd': { etiket: 'Post HD 2160×2880', format: 'post',   genislik: 2160, yukseklik: 2880, zemin: 'ortak/zemin/post-hd.png' },
  hikaye:    { etiket: 'Hikâye 1080×1920',  format: 'hikaye', genislik: 1080, yukseklik: 1920, zemin: 'ortak/zemin/hikaye.png' },
};

export const GORSEL_FORMAT_YUKSEKLIK: Record<GorselFormat, number> = { post: 1440, hikaye: 1920 };

export const GORSEL_SABLONLAR: Record<GorselSablon, { ad: string; dosya: GorselVarlikYolu; ciktilar: GorselCikti[] }> = {
  'mac-gunu': { ad: 'Maç Günü', dosya: 'sablonlar/mac-gunu.html', ciktilar: ['post', 'post-hd', 'hikaye'] },
};

export interface GorselOyuncu {
  nick: string;
  /** HLTV kadrajının 1,4 katı, 1120×1168 şeffaf PNG (havuzdan üretilir). */
  foto: GorselVarlikYolu;
}

export interface GorselTakim {
  ad: string;
  /** Beyaz tek renk ya da şeffaf logo; şablon beyaza çevirir ve ölçer. */
  logo: GorselVarlikYolu;
  oyuncular?: GorselOyuncu[];
}

/**
 * Kadrosu ve fotoğrafları hazır olan takımlar. Yeni takım: fotoğraflar havuza
 * girer, 1,4 kat kadrajları `gorsel/takimlar/<takim>/oyuncular/` altına konur,
 * buraya eklenir.
 */
export const GORSEL_TAKIMLAR: Record<string, GorselTakim> = {
  bbl: {
    ad: 'BBL Esports',
    logo: 'takimlar/bbl/logo.png',
    oyuncular: [
      { nick: 'leakz',   foto: 'takimlar/bbl/oyuncular/leakz.png' },
      { nick: 'salazar', foto: 'takimlar/bbl/oyuncular/salazar.png' },
      { nick: 'NickyB',  foto: 'takimlar/bbl/oyuncular/nickyb.png' },
      { nick: 'IceBerg', foto: 'takimlar/bbl/oyuncular/iceberg.png' },
      { nick: 'MistR',   foto: 'takimlar/bbl/oyuncular/mistr.png' },
    ],
  },
};

/** Logosu hazır rakipler. Listede olmayan rakibin logosu formdan yüklenir. */
export const GORSEL_RAKIPLER: Record<string, GorselTakim> = {
  sinners: { ad: 'SINNERS', logo: 'takimlar/sinners/logo.png' },
};

/** Yüklenen logo için üst sınır (data URL uzunluğu, ~2 MB dosya). */
export const GORSEL_LOGO_AZAMI_URL = 2_800_000;

/** postMessage tipleri: panel ↔ şablon iframe'i. */
export const GORSEL_MESAJ = {
  hazir: 'gorsel-hazir',
  veri: 'gorsel-veri',
  denetim: 'gorsel-denetim',
} as const;
