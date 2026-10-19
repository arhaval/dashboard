/**
 * Türkçe metin karşılaştırma yardımcıları.
 *
 * Tek kaynak: aynı katlama hem içerik motorunda (etiket eşleme, metin
 * denetimi) hem günlük aramasında kullanılıyor. İki ayrı kopya olsaydı biri
 * düzeltildiğinde diğeri sessizce farklı davranırdı.
 */

/**
 * Karşılaştırma için metni katlar: küçük harfe çevirir, aksanları atar,
 * `ı` ile `i`yi aynı sayar, fazla boşluğu tekler.
 *
 * `toLocaleLowerCase('tr')` önemli: varsayılan küçültme "I" harfini "i"
 * yapar, Türkçede "ı" olmalı. Aksan atma sayesinde "Xantares" ile "XANTARES",
 * "hikâye" ile "hikaye" eşleşir.
 */
export function foldTurkish(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // NFD sonrasi aksan isaretleri
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ');
}

/**
 * Arama: sorgudaki her kelime metinde geçiyor mu.
 *
 * Kelimeler ayrı aranır, yani "woxic masa" yazınca iki kelimenin ikisi de
 * geçen kayıtlar bulunur — sırası önemli değil. Boş sorgu her şeyi döndürür
 * (arama kutusu boşken liste gizlenmesin).
 */
export function matchesSearch(haystack: string, query: string): boolean {
  const needle = foldTurkish(query);
  if (!needle) return true;
  const text = foldTurkish(haystack);
  return needle.split(' ').every((word) => text.includes(word));
}
