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

export interface MonthProgress {
  /** Ay henüz bitmedi mi (içinde bulunulan ya da gelecek ay). */
  inProgress: boolean;
  /** Ayın kaçıncı günündeyiz; biten ayda ayın gün sayısı. */
  day: number;
  /** Ayın toplam gün sayısı. */
  days: number;
}

/**
 * Seçilen ayın ne kadarı yaşandı.
 *
 * resolveMonth VARSAYILAN olarak yarım ayı açmıyor, ama kullanıcı ay
 * seçicisinden içinde bulunulan ayı seçebilir. O durumda görüntülenme gibi ay
 * içinde BİRİKEN metrikler tam bir ayla kıyaslanamaz: 11 günlük Eylül'ü 31
 * günlük Ağustos'la kıyaslamak her şeyi çöküş gibi gösterir.
 */
export function monthProgress(month: string, now: Date = new Date()): MonthProgress {
  const [year, m] = month.split('-').map(Number);
  const days = new Date(year, m, 0).getDate();
  const current = currentMonthKey(now);
  if (month > current) return { inProgress: true, day: 0, days };
  if (month === current) return { inProgress: true, day: now.getDate(), days };
  return { inProgress: false, day: days, days };
}

/**
 * Analytics verisi 2-3 gün gecikmeyle oturur. Ay kapanır kapanmaz çekilen
 * değer son günleri eksik taşır ve cron yalnızca içinde bulunulan ayı
 * doldurduğu için bir daha düzelmez — Ağustos 2026 satırı 31 Ağustos 06:03'te
 * donmuştu. Yeni ayın ilk günlerinde önceki ay da yeniden çekilir.
 */
export const SETTLE_DAYS = 5;

/** Bu senkron çalıştırmasında yenilenecek aylar, eskiden yeniye. */
export function monthsToRefresh(now: Date = new Date()): string[] {
  const current = currentMonthKey(now);
  if (now.getDate() > SETTLE_DAYS) return [current];
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return [currentMonthKey(previous), current];
}

/**
 * Aylık rapor, ay BİTTİKTEN sonra bir sonraki ayın bu gününde tamamlanır:
 * Ağustos raporu 10 Eylül'de, Eylül raporu 10 Ekim'de. Ay takvim ayıdır; 10
 * dönemi değil rapor gününü belirtir.
 */
export const REPORT_DUE_DAY = 10;

/** Bir ayın raporunun tamamlanacağı gün: '2026-08' → 10 Eylül 2026. */
export function reportDueDate(month: string): Date {
  const [year, m] = month.split('-').map(Number);
  // Date ayı 0 tabanlı alır: 1 tabanlı `m` doğrudan bir sonraki aya denk gelir.
  return new Date(year, m, REPORT_DUE_DAY);
}
