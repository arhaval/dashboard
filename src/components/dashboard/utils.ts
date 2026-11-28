/**
 * Dashboard'lar için saf yardımcılar (yayıncı, admin, diğer roller).
 * Tarihler gün çözünürlüğünde; "bugün" Türkiye saatine göre (lib/utils/dates).
 */

import { todayTR } from '@/lib/utils/dates';

export const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Türkiye saatine göre bugün (YYYY-MM-DD). */
export const todayStr = () => todayTR();

const day = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime();

/** "20 Kas" */
export const shortDate = (d: string) =>
  new Date(day(d)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Geçmiş tarih: "Bugün" · "Dün" · "3 gün önce" · "20 Kas" */
export function relPast(d: string, today = todayStr()): string {
  const n = Math.round((day(today) - day(d)) / 864e5);
  if (n <= 0) return 'Bugün';
  if (n === 1) return 'Dün';
  if (n < 7) return `${n} gün önce`;
  return shortDate(d);
}

/** Gelecek tarih: "Bugün" · "Yarın" · "12 Aralık Cum" */
export function relFuture(d: string, today = todayStr()): string {
  const n = Math.round((day(d) - day(today)) / 864e5);
  if (n <= 0) return 'Bugün';
  if (n === 1) return 'Yarın';
  return new Date(day(d)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short', timeZone: 'UTC' });
}

/** "YYYY-MM" ayının bir öncekisi */
export function prevMonthOf(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Ayın bitmesine kalan gün */
export function daysLeftInMonth(month: string, today = todayStr()): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate() - Number(today.slice(8, 10));
}

/** Geçen aya göre fark satırı (trend + metin) */
export function diffText(diff: number) {
  if (diff === 0) return { trend: 'neutral' as const, text: 'geçen ayla aynı' };
  return { trend: diff > 0 ? ('up' as const) : ('down' as const), text: `${diff > 0 ? '+' : ''}${diff} geçen aya göre` };
}

/** "Engin Can Avcı" → "EC" */
export const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
