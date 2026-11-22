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

/**
 * Sayfa 1080 px genişlikte, 2x ölçekte (2160 px) çizilir. 1080'lik çıktılar bu
 * çizimden Lanczos ile küçültülür; HD çıktı çizimin kendisidir (fotoğraflar HD
 * için birebir üretildiğinden yeniden örnekleme olmaz). 4x çizim sunucu
 * fonksiyonunun belleğini (1 GB) aşıyordu.
 */
export const GORSEL_SAYFA_GENISLIGI = 1080;
export const GORSEL_CIZIM_OLCEGI = 2;

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
  /**
   * HLTV kadrajıyla birebir aynı kadraj, şeffaf PNG (havuzdan üretilir). 1120×1168 HD çıktıya da
   * yeter; 800×834 yalnız 1080'lik çıktılara yeter (şablon büyütmeyi reddeder).
   */
  foto: GorselVarlikYolu;
}

export interface GorselTakim {
  ad: string;
  /** arhaval.com'daki takım adı/slug eşleşmeleri (küçük harf, yalnız harf-rakam). */
  eslesme?: string[];
  /** Beyaz tek renk ya da şeffaf logo; şablon beyaza çevirir ve ölçer. */
  logo: GorselVarlikYolu;
  /** Oyuncuları şablonda soldan sağa bu sırayla; ortadaki (3.) en önde durur. */
  oyuncular?: GorselOyuncu[];
  /** Fotoğraflar HD çıktı için yeterli değilse false (ör. yalnız 800 px HLTV fotoğrafı varsa). */
  hdFoto?: boolean;
}

/**
 * Kadrosu ve fotoğrafları hazır olan takımlar. Yeni takım: fotoğraflar havuza
 * girer, 1,4 kat kadrajları `gorsel/takimlar/<takim>/oyuncular/` altına konur,
 * buraya eklenir.
 */
export const GORSEL_TAKIMLAR: Record<string, GorselTakim> = {
  bbl: {
    ad: 'BBL Esports',
    eslesme: ['bblesports', 'bbl'],
    logo: 'takimlar/bbl/logo.png',
    oyuncular: [
      { nick: 'leakz',   foto: 'takimlar/bbl/oyuncular/leakz.png' },
      { nick: 'salazar', foto: 'takimlar/bbl/oyuncular/salazar.png' },
      { nick: 'NickyB',  foto: 'takimlar/bbl/oyuncular/nickyb.png' },
      { nick: 'IceBerg', foto: 'takimlar/bbl/oyuncular/iceberg.png' },
      { nick: 'MistR',   foto: 'takimlar/bbl/oyuncular/mistr.png' },
    ],
  },
  // Kadro PGL Major Singapore 2026 listesiyle doğrulandı (Kasım 2026). Fotoğraflar HLTV'nin
  // 2026 fotoğrafları (2x); çekim fotoğrafı gelince değiştirilir.
  ef: {
    ad: 'Eternal Fire',
    eslesme: ['eternalfire', 'ef'],
    logo: 'takimlar/ef/logo.png',
    hdFoto: false,
    oyuncular: [
      { nick: 'Kvem',    foto: 'takimlar/ef/oyuncular/kvem.png' },
      { nick: 'soulfly', foto: 'takimlar/ef/oyuncular/soulfly.png' },
      { nick: 'jottAAA', foto: 'takimlar/ef/oyuncular/jottaaa.png' },
      { nick: 'regali',  foto: 'takimlar/ef/oyuncular/regali.png' },
      { nick: 'MisteM',  foto: 'takimlar/ef/oyuncular/mistem.png' },
    ],
  },
  // Kadro PGL Major Singapore 2026 listesiyle doğrulandı (Kasım 2026). Fotoğraflar 16.07.2026 çekimi.
  aurora: {
    ad: 'Aurora',
    eslesme: ['aurora', 'auroragaming'],
    logo: 'takimlar/aurora/logo.png',
    oyuncular: [
      { nick: 'woxic',    foto: 'takimlar/aurora/oyuncular/woxic.png' },
      { nick: 'Wicadia',  foto: 'takimlar/aurora/oyuncular/wicadia.png' },
      { nick: 'XANTARES', foto: 'takimlar/aurora/oyuncular/xantares.png' },
      { nick: 'Jimpphat', foto: 'takimlar/aurora/oyuncular/jimpphat.png' },
      { nick: 'kyxsan',   foto: 'takimlar/aurora/oyuncular/kyxsan.png' },
    ],
  },
};

/** Logosu hazır rakipler. Listede olmayan rakibin logosu formdan yüklenir. */
export const GORSEL_RAKIPLER: Record<string, GorselTakim> = {
  sinners: { ad: 'SINNERS', eslesme: ['sinners', 'sinnersesports'], logo: 'takimlar/sinners/logo.png' },
};

/**
 * arhaval.com'un yaklaşan maç listesi (HLTV verisi, Türk takımları). Panel bu listeden
 * maç seçtirir; seçilen maçın postu kendiliğinden doldurulur. Uç: tahmin reposu,
 * src/app/api/gorsel/yaklasan-maclar.
 */
export const GORSEL_ARHAVAL_COM_URL = process.env.ARHAVAL_COM_URL ?? 'https://arhaval.com';
export const GORSEL_MAC_PENCERESI_SAAT = 72;
/** Maçın yayıncı listesinde bu geçiyorsa maçı Arhaval yayınlıyor sayılır (yayın satırı kuralı). */
export const GORSEL_ARHAVAL_KANALI = /arhaval/i;

/**
 * Arhaval'ın turnuva yazımı. HLTV adı desene uyarsa postta bu yazılır; "Stage 1" gibi
 * aşama ekleri korunur. Kural: Singapur Major noktasız I ile "SINGAPUR MAJOR".
 */
export const GORSEL_TURNUVA_ADLARI: { desen: RegExp; ad: string }[] = [
  { desen: /^(?=.*\bmajor\b)(?=.*\bsingapore\b).*$/i, ad: 'SINGAPUR MAJOR' },
];

/** Yüklenen logo için üst sınır (data URL uzunluğu, ~2 MB dosya). */
export const GORSEL_LOGO_AZAMI_URL = 2_800_000;

/** postMessage tipleri: panel ↔ şablon iframe'i. */
export const GORSEL_MESAJ = {
  hazir: 'gorsel-hazir',
  veri: 'gorsel-veri',
  denetim: 'gorsel-denetim',
} as const;
