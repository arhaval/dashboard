/**
 * Sunucu tarafı sayfalama — saf katman.
 *
 * Panelde 21 elle yazılmış tablo var ve hiçbiri sayfalamıyordu; İş Takibi 173,
 * Finans 157, Ödemeler 112 kaydı tek seferde basıyordu. Liste büyüdükçe sayfa
 * ağırlaşıyor ve aradığın kayıt ekranda kayboluyor.
 *
 * Sayfa numarası URL'de (`?sayfa=2`) duruyor: sunucu bileşeni kendi dilimini
 * keser, istemciye fazladan kod gitmez, bağlantı paylaşılabilir ve geri tuşu
 * beklendiği gibi çalışır.
 */

/** Varsayılan sayfa boyutu — CLAUDE.md'deki kural. */
export const PAGE_SIZE = 20;

export interface Paged<T> {
  rows: T[];
  /** Sınırlanmış geçerli sayfa (1 tabanlı). */
  page: number;
  totalPages: number;
  total: number;
  /** Gösterilen aralık, 1 tabanlı ve kullanıcıya yazılmaya hazır. */
  from: number;
  to: number;
}

/**
 * URL'den gelen sayfa değerini sayıya çevirir.
 * Bozuk, eksi ya da sıfır değerler ilk sayfaya düşer — kullanıcı adres
 * çubuğunda ne yazarsa yazsın tablo boş kalmaz.
 */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/**
 * Listeyi sayfaya böler.
 *
 * İstenen sayfa son sayfanın ötesindeyse son sayfa gösterilir — boş tablo
 * göstermek yerine. Liste boşsa tek sayfa sayılır ve aralık 0–0 olur.
 */
export function paginate<T>(items: T[], requestedPage: number, pageSize = PAGE_SIZE): Paged<T> {
  const total = items.length;
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * size;
  const rows = items.slice(start, start + size);
  return {
    rows,
    page,
    totalPages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + rows.length,
  };
}

/**
 * Sayfa bağlantısı kurar, mevcut filtreleri koruyarak.
 *
 * Filtreler korunmazsa sayfa değiştirmek filtreyi sıfırlar — kullanıcı
 * "Barkın'ın onaylı işleri"ni süzüp ikinci sayfaya geçtiğinde her şeyi
 * yeniden görürdü. Birinci sayfada `sayfa` parametresi hiç yazılmaz ki
 * adres temiz kalsın.
 */
export function pageHref(
  basePath: string,
  params: Record<string, string | string[] | undefined>,
  page: number
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'sayfa' || value === undefined) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) search.set(key, single);
  }
  if (page > 1) search.set('sayfa', String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
