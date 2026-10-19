/**
 * Rol → sayfa erişiminin deterministik doğrulaması.
 *
 *   pnpm exec tsx scripts/check-permissions.ts
 *
 * Veritabanına dokunmaz. Asıl sınanan şey açılış sayfası: tek sayfası olan bir
 * rol (ör. editör yalnızca İçerik Takip) girişte oraya gitmeli. Eskiden
 * erişilemeyen sayfa istendiğinde `/` deneniyordu; ana sayfası kapalı bir rol
 * için bu sonsuz yönlendirme demekti — hata ekranda "sayfa açılmıyor" diye
 * görünür, sebebi görünmez.
 */

import {
  ALL_PAGE_KEYS,
  DEFAULT_PAGES,
  PAGE_DEFS,
  landingPathFor,
  pageKeyForPath,
  type PageKey,
} from '../src/constants/permissions';

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

// ── 1. Açılış sayfası ───────────────────────────────────────────────────────

eq('yalnızca İçerik Takip yetkisi olan rol oraya açılır',
  landingPathFor(['content-plan']), '/icerik-plani');
eq('ana sayfası olan rol köke açılır',
  landingPathFor(['dashboard', 'work-items']), '/');
eq('ana sayfa yoksa menüdeki ilk yetkili sayfaya açılır',
  landingPathFor(['payments', 'work-items']), '/work-items');
// Hiç yetkisi olmayan rol: yönlendirecek yer yok. Kök döner ve düzen orada
// "yetkin yok" ekranını gösterir — döngüye girmez.
eq('yetkisiz rol kökte kalır', landingPathFor([]), '/');

// Açılış sayfası her zaman GERÇEKTEN erişilebilir bir sayfa olmalı; yoksa
// yönlendirme yine engele çarpar ve döngü kurulur.
for (const [role, pages] of Object.entries(DEFAULT_PAGES)) {
  const landing = landingPathFor(pages as PageKey[]);
  const key = pageKeyForPath(landing);
  check(
    `${role}: açılış sayfası kendi yetkisinde`,
    key === null || (pages as PageKey[]).includes(key),
    { landing, key, pages }
  );
}

// Tek sayfası olan her rol için açılış o sayfa olmalı — editör örneği
// kuraldan değil, kuralın özel hâli olsun.
for (const def of PAGE_DEFS) {
  if (def.key === 'dashboard') continue;
  eq(`tek yetki ${def.key} → ${def.route}`, landingPathFor([def.key]), def.route);
}

// ── 2. Yol → sayfa eşlemesi ─────────────────────────────────────────────────

eq('/icerik-plani → content-plan', pageKeyForPath('/icerik-plani'), 'content-plan');
eq('kök → dashboard', pageKeyForPath('/'), 'dashboard');
eq('tanımsız yol matrise takılmaz', pageKeyForPath('/boyle-bir-sayfa-yok'), null);
// /team/{id} kişinin kendi profili; sayfa sahipliği kendi içinde denetliyor.
eq('kendi profili matrise takılmaz', pageKeyForPath('/team/abc-123'), null);
eq('/team listesi matriste', pageKeyForPath('/team'), 'team');

// ── 3. Tanımların tutarlılığı ───────────────────────────────────────────────

eq('her sayfa anahtarının tanımı var', PAGE_DEFS.length, ALL_PAGE_KEYS.length);
check('her rolün varsayılanı geçerli anahtarlardan oluşur',
  Object.values(DEFAULT_PAGES).every((pages) =>
    (pages as PageKey[]).every((p) => (ALL_PAGE_KEYS as string[]).includes(p))
  ),
  DEFAULT_PAGES);

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
