/**
 * Hangi ay gösterilecek — üç ekranın ortak kuralı.
 *
 * Varsayılan İÇİNDE BULUNULAN AY DEĞİL: 8 günlük bir ayı tam bir ayla
 * kıyaslamak her metriği %90 çöküş gibi gösterir. Kapanmış son ay varsayılır.
 */

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * URL'den gelen ayı doğrula ve kullanılacak ayı seç.
 *
 * - Geçerli bir `?month=` verilmişse ona saygı duyulur (paylaşılan link,
 *   bildirimden gelen yönlendirme).
 * - Yoksa kapanmış en güncel ay.
 * - Hiç veri yoksa içinde bulunulan ay (ekran boş ama tutarlı açılır).
 */
export function resolveMonth(
  requested: string | undefined,
  available: string[],
  now: Date = new Date()
): string {
  if (requested && /^\d{4}-\d{2}$/.test(requested)) return requested;

  const current = currentMonthKey(now);
  const complete = available.filter((m) => m < current).sort();
  if (complete.length > 0) return complete[complete.length - 1];

  const any = [...available].sort();
  return any.length > 0 ? any[any.length - 1] : current;
}
