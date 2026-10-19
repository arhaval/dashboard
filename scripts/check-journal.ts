/**
 * Günlük'ün saf katmanının deterministik doğrulaması.
 *
 *   pnpm exec tsx scripts/check-journal.ts
 *
 * Veritabanına dokunmaz. En kritik şey tarih: gün anahtarı bir gün kayarsa
 * yazdığın not başka güne düşer ve bunu aylar sonra fark edersin.
 */

import {
  filterEntries,
  formatDayLabel,
  previewOf,
  relativeDayLabel,
  todayKey,
} from '../src/app/(dashboard)/gunluk/journal.constants';
import { foldTurkish, matchesSearch } from '../src/lib/turkish';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) { passed += 1; return; }
  failures.push(detail === undefined ? name : `${name} — beklenmeyen: ${JSON.stringify(detail)}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? undefined : { actual, expected });
}

// ── 1. Gün anahtarı yerel saatte ────────────────────────────────────────────
// `new Date('2026-10-20')` UTC gece yarısı demektir; Türkiye saatinde bir gün
// geriye kayar. Anahtar bu yüzden yerel parçalardan kuruluyor.

eq('gece yarısından hemen sonra bugün doğru',
  todayKey(new Date(2026, 9, 20, 0, 30)), '2026-10-20');
eq('gece yarısından hemen önce bugün doğru',
  todayKey(new Date(2026, 9, 20, 23, 45)), '2026-10-20');
eq('tek haneli ay ve gün sıfırla doldurulur',
  todayKey(new Date(2026, 0, 5, 12, 0)), '2026-01-05');

// ── 2. Etiketler ────────────────────────────────────────────────────────────

eq('tam tarih etiketi', formatDayLabel('2026-10-20'), '20 Ekim 2026, Salı');
eq('ayın ilk günü', formatDayLabel('2026-01-01'), '1 Ocak 2026, Perşembe');
eq('bozuk anahtar olduğu gibi döner', formatDayLabel('abc'), 'abc');

const NOW = new Date(2026, 9, 20, 12, 0);
eq('bugün "Bugün"', relativeDayLabel('2026-10-20', NOW), 'Bugün');
eq('dün "Dün"', relativeDayLabel('2026-10-19', NOW), 'Dün');
eq('önceki gün tam tarih', relativeDayLabel('2026-10-18', NOW), '18 Ekim 2026, Pazar');
// Ay başında "dün" geçen aya düşer; gün çıkarma bunu kendisi halleder.
eq('ayın ilk günü için dün geçen ay',
  relativeDayLabel('2026-09-30', new Date(2026, 9, 1, 12, 0)), 'Dün');

// ── 3. Arama ────────────────────────────────────────────────────────────────

const entries = [
  { note_date: '2026-10-20', body: 'Woxic masa metnini yazdım, hook çok uzun olmuş' },
  { note_date: '2026-10-19', body: 'XANTARES videosu 40k izlenmede takıldı' },
  { note_date: '2026-09-15', body: 'Instagram erişimi düştü, neden bakmak lazım' },
];

eq('boş sorgu her şeyi döndürür', filterEntries(entries, '').length, 3);
eq('boşluktan oluşan sorgu her şeyi döndürür', filterEntries(entries, '   ').length, 3);
eq('kelime araması', filterEntries(entries, 'woxic').length, 1);
eq('büyük/küçük harf farkı yok', filterEntries(entries, 'XaNtArEs').length, 1);
eq('iki kelime birlikte aranır', filterEntries(entries, 'instagram erişimi').length, 1);
eq('sıra önemsiz', filterEntries(entries, 'erişimi instagram').length, 1);
eq('eşleşmeyen sorgu boş döner', filterEntries(entries, 'valorant').length, 0);
// Tarih de aranabilir: "ekim" ya da "2026-09" yazınca o günler gelir.
eq('ay adıyla arama', filterEntries(entries, 'eylül').length, 1);
eq('tarih parçasıyla arama', filterEntries(entries, '2026-10').length, 2);

// Türkçe katlama: aksan ve ı/i farkı aramayı bozmamalı.
eq('aksanlı harf eşleşir', matchesSearch('hikâye', 'hikaye'), true);
eq('ı ile i eşleşir', matchesSearch('Işık', 'isik'), true);
eq('büyük I küçük ı olur', foldTurkish('IŞIK'), 'isik');

// ── 4. Önizleme ─────────────────────────────────────────────────────────────

eq('önizleme ilk dolu satırı alır',
  previewOf('\n\nilk satır\nikinci satır'), 'ilk satır');
eq('boş gövde boş önizleme', previewOf('   \n  '), '');
eq('uzun satır kısaltılır', previewOf('a'.repeat(200), 10), `${'a'.repeat(10)}…`);
eq('sınırdaki satır kısaltılmaz', previewOf('a'.repeat(10), 10), 'a'.repeat(10));

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
