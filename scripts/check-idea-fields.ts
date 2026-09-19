/**
 * Fikir Havuzu — kanca tipi ve "neden tutar" alanlarının deterministik
 * doğrulaması.
 *
 *   pnpm exec tsx scripts/check-idea-fields.ts
 *
 * Veritabanına dokunmaz; yalnızca saf katmanı (doğrulama, filtre, kayıt
 * yükü) sınar.
 */

import {
  HOOK_FILTER_NONE,
  HOOK_TYPES,
  HOOK_TYPE_LABELS,
  WHY_IT_WORKS_MAX,
  hookColumns,
  matchesHookFilter,
  normalizeWhyItWorks,
  parseHookType,
} from '../src/app/(dashboard)/fikir-havuzu/idea.constants';

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

// ── 1. Seçim listesi ────────────────────────────────────────────────────────

eq('dört kanca tipi, belirlenen sırayla', HOOK_TYPES.map((h) => HOOK_TYPE_LABELS[h]), [
  'Tanınan isim + hatırlanan tartışma',
  'Tanınan isim, yeni bilgi',
  'Güncel haber',
  'Sistem/kural anlatımı',
]);

// ── 2. Doğrulama ────────────────────────────────────────────────────────────

for (const h of HOOK_TYPES) eq(`geçerli tip: ${h}`, parseHookType(h), h);
eq('bilinmeyen tip → null', parseHookType('UYDURMA'), null);
eq('boş → null', parseHookType(''), null);
eq('null → null', parseHookType(null), null);
eq('sayı → null', parseHookType(42), null);
// Eski kayıtlarda anahtar yok (migration öncesi satır).
eq('undefined → null', parseHookType(undefined), null);

eq('neden tutar kırpılır', normalizeWhyItWorks('  herkes o maçı hatırlıyor  '), 'herkes o maçı hatırlıyor');
eq('neden tutar tek satıra iner', normalizeWhyItWorks('herkes\n  hatırlıyor\tama'), 'herkes hatırlıyor ama');
eq('yalnız boşluk → null', normalizeWhyItWorks('   \n '), null);
eq('null → null', normalizeWhyItWorks(null), null);
eq('tek satır sınırı', WHY_IT_WORKS_MAX, 160);

// ── 3. Filtre ───────────────────────────────────────────────────────────────

check('Tümü: tipli fikir görünür', matchesHookFilter('CURRENT_NEWS', 'ALL'));
check('Tümü: tipsiz fikir görünür', matchesHookFilter(null, 'ALL'));
check('belirtilmemiş: tipsiz fikir görünür', matchesHookFilter(null, HOOK_FILTER_NONE));
check('belirtilmemiş: tipli fikir gizlenir', !matchesHookFilter('CURRENT_NEWS', HOOK_FILTER_NONE));
check('seçili tip: eşleşen görünür', matchesHookFilter('SYSTEM_EXPLAINER', 'SYSTEM_EXPLAINER'));
check('seçili tip: başka tip gizlenir', !matchesHookFilter('CURRENT_NEWS', 'SYSTEM_EXPLAINER'));
check('seçili tip: tipsiz fikir gizlenir', !matchesHookFilter(null, 'CURRENT_NEWS'));

// ── 4. Kayıt yükü ───────────────────────────────────────────────────────────
// Kolonlar migration'dan önce yoksa, alanları boş bırakan kayıt yine
// yazılabilmeli: boş değer gönderilmez. Kolon varsa null da gönderilir ki
// alan temizlenebilsin.

eq('kolon yok + boş alanlar: hiçbir şey gönderilmez',
  hookColumns({ hookType: null, whyItWorks: null }, false), {});
eq('kolon yok + dolu tip: yalnız dolu alan',
  hookColumns({ hookType: 'CURRENT_NEWS', whyItWorks: null }, false), { hook_type: 'CURRENT_NEWS' });
eq('kolon var + boş alanlar: temizlemek için null',
  hookColumns({ hookType: null, whyItWorks: null }, true), { hook_type: null, why_it_works: null });
eq('kolon var + dolu alanlar',
  hookColumns({ hookType: 'KNOWN_NAME_DEBATE', whyItWorks: 'herkes hatırlıyor' }, true),
  { hook_type: 'KNOWN_NAME_DEBATE', why_it_works: 'herkes hatırlıyor' });

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
