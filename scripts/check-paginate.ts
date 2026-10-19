/**
 * Sunucu tarafı sayfalamanın deterministik doğrulaması.
 *
 *   pnpm exec tsx scripts/check-paginate.ts
 *
 * Veritabanına dokunmaz. İki şey kritik: sınır dışı sayfa istendiğinde tablo
 * BOŞ görünmemeli, ve sayfa değiştirmek filtreyi düşürmemeli. İkisi de
 * "panel bozuk" hissi yaratır ama kod hata vermez.
 */

import { PAGE_SIZE, pageHref, paginate, parsePage } from '../src/lib/paginate';

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

const items = Array.from({ length: 45 }, (_, i) => i + 1);

// ── 1. Dilimleme ────────────────────────────────────────────────────────────

const p1 = paginate(items, 1, 20);
eq('ilk sayfa 20 kayıt', p1.rows.length, 20);
eq('ilk sayfa 1 ile başlar', p1.rows[0], 1);
eq('toplam sayfa 3', p1.totalPages, 3);
eq('aralık 1–20', [p1.from, p1.to], [1, 20]);

const p3 = paginate(items, 3, 20);
eq('son sayfada kalan 5 kayıt', p3.rows.length, 5);
eq('son sayfa 41 ile başlar', p3.rows[0], 41);
eq('aralık 41–45', [p3.from, p3.to], [41, 45]);

// ── 2. Sınır dışı istek boş tablo göstermez ─────────────────────────────────
// Filtre daraltıldığında URL'de eski sayfa numarası kalır; o anda boş tablo
// göstermek yerine son geçerli sayfa gösterilir.

const beyond = paginate(items, 99, 20);
eq('sınırın ötesi son sayfaya düşer', beyond.page, 3);
check('sınırın ötesinde satır var', beyond.rows.length === 5, beyond.rows.length);

const zero = paginate(items, 0, 20);
eq('sıfır sayfa ilk sayfaya düşer', zero.page, 1);
const negative = paginate(items, -5, 20);
eq('eksi sayfa ilk sayfaya düşer', negative.page, 1);

// ── 3. Boş liste ────────────────────────────────────────────────────────────

const empty = paginate([], 1, 20);
eq('boş liste tek sayfa', empty.totalPages, 1);
eq('boş listede aralık 0–0', [empty.from, empty.to], [0, 0]);
eq('boş listede satır yok', empty.rows, []);

// Tam bölünen liste fazladan boş sayfa üretmemeli.
eq('40 kayıt / 20 = 2 sayfa', paginate(Array(40).fill(0), 1, 20).totalPages, 2);
eq('20 kayıt / 20 = 1 sayfa', paginate(Array(20).fill(0), 1, 20).totalPages, 1);
eq('21 kayıt / 20 = 2 sayfa', paginate(Array(21).fill(0), 1, 20).totalPages, 2);

eq('varsayılan sayfa boyutu 20', PAGE_SIZE, 20);
eq('varsayılan boyut uygulanır', paginate(items, 1).rows.length, 20);

// ── 4. URL'den gelen sayfa değeri ───────────────────────────────────────────

eq('"2" → 2', parsePage('2'), 2);
eq('tanımsız → 1', parsePage(undefined), 1);
eq('boş → 1', parsePage(''), 1);
eq('yazı → 1', parsePage('abc'), 1);
eq('eksi → 1', parsePage('-3'), 1);
eq('sıfır → 1', parsePage('0'), 1);
eq('ondalık aşağı yuvarlanır', parsePage('2.7'), 2);
eq('dizi gelirse ilki', parsePage(['3', '5']), 3);

// ── 5. Bağlantı filtreleri korur ────────────────────────────────────────────
// Korunmazsa "Barkın'ın onaylı işleri"ni süzüp 2. sayfaya geçmek filtreyi
// sıfırlar ve kullanıcı her şeyi yeniden görür.

eq('filtreler korunur',
  pageHref('/work-items', { status: 'APPROVED', user_id: 'u1' }, 2),
  '/work-items?status=APPROVED&user_id=u1&sayfa=2');
eq('birinci sayfada sayfa parametresi yazılmaz',
  pageHref('/work-items', { status: 'APPROVED' }, 1),
  '/work-items?status=APPROVED');
eq('filtre yoksa adres temiz', pageHref('/finance', {}, 1), '/finance');
eq('filtresiz ikinci sayfa', pageHref('/finance', {}, 2), '/finance?sayfa=2');
// Eski sayfa değeri taşınmaz; yoksa adres ?sayfa=2&sayfa=3 olurdu.
eq('gelen sayfa değeri taşınmaz',
  pageHref('/payments', { tab: 'completed', sayfa: '7' }, 2),
  '/payments?tab=completed&sayfa=2');
eq('boş filtre değeri yazılmaz',
  pageHref('/work-items', { status: '', type: 'VOICE' }, 1),
  '/work-items?type=VOICE');

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
