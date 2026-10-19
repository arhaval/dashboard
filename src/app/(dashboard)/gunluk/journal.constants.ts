/**
 * Günlük — saf yardımcılar (client/server ikisi de import edebilir).
 */

import { matchesSearch } from '@/lib/turkish';

export interface JournalEntry {
  note_date: string;
  body: string;
}

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Yerel saatte bugünün YYYY-MM-DD karşılığı. */
export function todayKey(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * "2026-10-20" → "20 Ekim 2026, Pazartesi".
 *
 * Tarih parçalardan kuruluyor, `new Date('2026-10-20')` ile değil: o biçim UTC
 * gece yarısı olarak okunur ve Türkiye saatinde bir gün geriye kayabilir.
 */
export function formatDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const dayName = TR_DAYS[new Date(y, m - 1, d).getDay()];
  return `${d} ${TR_MONTHS[m - 1]} ${y}, ${dayName}`;
}

/** Bugün / dün için kısa etiket; ötesi tam tarih. */
export function relativeDayLabel(key: string, now: Date = new Date()): string {
  if (key === todayKey(now)) return 'Bugün';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === todayKey(yesterday)) return 'Dün';
  return formatDayLabel(key);
}

/**
 * Arama: gün metninde sorgunun bütün kelimeleri geçiyor mu.
 * Tarih de aranabilir ("ekim", "2026-10") — not içeriğiyle birlikte taranır.
 */
export function filterEntries<T extends JournalEntry>(entries: T[], query: string): T[] {
  if (!query.trim()) return entries;
  return entries.filter((e) => matchesSearch(`${e.note_date} ${formatDayLabel(e.note_date)} ${e.body}`, query));
}

/** Listede gösterilecek kısa önizleme — ilk satır, uzunsa kısaltılmış. */
export function previewOf(body: string, max = 120): string {
  const firstLine = body.trim().split('\n').find((l) => l.trim()) ?? '';
  const clean = firstLine.trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}
