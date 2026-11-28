/**
 * Türkiye saatine göre tarih yardımcıları — tek kaynak.
 *
 * `new Date().toISOString()` UTC verir; Vercel sunucuları da UTC'de çalışır.
 * Türkiye UTC+3 olduğu için 00:00–03:00 arasında "bugün" bir önceki gün
 * görünür (ör. gece maçından sonra girilen yayın dünün tarihine düşer).
 * Kullanıcıya görünen/varsayılan "bugün" ve "bu ay" buradan alınır.
 */

export const APP_TIME_ZONE = 'Europe/Istanbul';

const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD, Türkiye saatine göre. */
export function todayTR(now: Date = new Date()): string {
  return ymd.format(now);
}

/** YYYY-MM, Türkiye saatine göre. */
export function currentMonthTR(now: Date = new Date()): string {
  return todayTR(now).slice(0, 7);
}

/** Türkiye saatine göre bugünden `days` gün önce (YYYY-MM-DD). */
export function daysAgoTR(days: number, now: Date = new Date()): string {
  const [y, m, d] = todayTR(now).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - days));
  return dt.toISOString().slice(0, 10);
}
