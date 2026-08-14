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
 * Seçilebilir ayların KESİNTİSİZ listesi (eskiden yeniye).
 *
 * Neden kayıtlardan türetmiyoruz: bir ayda hiç veri girilmemişse o ay
 * social_monthly_metrics'te yoktur ve listede görünmezdi — yani hiç
 * girilmemiş bir aya gidip "tamamlandı" işaretlemek imkânsızdı. Aralık,
 * bilinen en eski aydan içinde bulunulan aya kadar doldurulur.
 */
export function selectableMonths(available: string[], now: Date = new Date()): string[] {
  const current = currentMonthKey(now);
  const known = [...available].sort();
  const start = known[0] ?? current;

  const out: string[] = [];
  let [year, month] = start.split('-').map(Number);
  // Güvenlik freni: bozuk bir başlangıç sonsuz döngüye dönüşmesin.
  for (let i = 0; i < 240; i += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    out.push(key);
    if (key >= current) break;
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return out;
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
