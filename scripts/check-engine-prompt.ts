/**
 * İçerik Motoru — kelime hedefi ve prompt biçimi doğrulaması.
 *
 *   pnpm exec tsx scripts/check-engine-prompt.ts
 *
 * Veritabanına dokunmaz; yalnızca saf katmanı (süre→kelime türetme + prompt
 * kurucu) sınar.
 */

import {
  DURATION_OPTIONS,
  PROMPT_VERSION,
  WORD_TARGETS,
  wordTargetFor,
  type DurationOption,
} from '../src/app/(dashboard)/motor/engine.constants';
import { buildArhavalizePrompt, type PromptContext } from '../src/services/ai-engine.prompt';

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

// ── Kelime hedefi tablosu ───────────────────────────────────────────────────

const SPEC: Record<DurationOption, [number, number]> = {
  '30 sn':  [70, 100],
  '45 sn':  [110, 150],
  '60 sn':  [150, 190],
  '90 sn':  [230, 280],
  '2 dk':   [310, 370],
  '2.5 dk': [390, 460],
  '3 dk':   [470, 550],
};

eq('süre seçenekleri tam liste', [...DURATION_OPTIONS], Object.keys(SPEC));

for (const d of DURATION_OPTIONS) {
  const [min, max] = SPEC[d];
  eq(`${d} bandı`, WORD_TARGETS[d], { min, max });
  check(`${d} min < max`, WORD_TARGETS[d].min < WORD_TARGETS[d].max);
}

// Her bandın ortası ~170 kelime/dk'ya denk gelmeli (±%3 tolerans).
const SECONDS: Record<DurationOption, number> = {
  '30 sn': 30, '45 sn': 45, '60 sn': 60, '90 sn': 90,
  '2 dk': 120, '2.5 dk': 150, '3 dk': 180,
};
for (const d of DURATION_OPTIONS) {
  const mid = (WORD_TARGETS[d].min + WORD_TARGETS[d].max) / 2;
  const wpm = mid / (SECONDS[d] / 60);
  check(`${d} ≈170 kelime/dk`, Math.abs(wpm - 170) <= 170 * 0.03, { wpm: Math.round(wpm) });
}

// Süre arttıkça bant da artmalı — sıralama bozulursa seçim anlamsızlaşır.
for (let i = 1; i < DURATION_OPTIONS.length; i++) {
  const prev = WORD_TARGETS[DURATION_OPTIONS[i - 1]];
  const cur = WORD_TARGETS[DURATION_OPTIONS[i]];
  check(`${DURATION_OPTIONS[i]} bandı bir öncekinden büyük`, cur.min > prev.min && cur.max > prev.max);
}

// ── wordTargetFor: türetme ve normalleştirme ────────────────────────────────

for (const d of DURATION_OPTIONS) eq(`preset türetilir: ${d}`, wordTargetFor(d), WORD_TARGETS[d]);

eq('virgüllü ondalık', wordTargetFor('2,5 dk'), WORD_TARGETS['2.5 dk']);
eq('büyük harf + nokta', wordTargetFor('2.5 DK.'), WORD_TARGETS['2.5 dk']);
eq('"saniye" açık yazımı', wordTargetFor('90 saniye'), WORD_TARGETS['90 sn']);
eq('"dakika" açık yazımı', wordTargetFor('3 dakika'), WORD_TARGETS['3 dk']);
eq('baş/son boşluk', wordTargetFor('  60 sn  '), WORD_TARGETS['60 sn']);

// Tanınmayan süre için hedef UYDURULMAZ.
eq('tablo dışı süre → null', wordTargetFor('4 dk'), null);
eq('serbest metin → null', wordTargetFor('kısa olsun'), null);
eq('boş → null', wordTargetFor(''), null);
eq('null → null', wordTargetFor(null), null);
eq('undefined → null', wordTargetFor(undefined), null);

// ── Prompt: kelime hedefi ayrı satır ────────────────────────────────────────

function ctx(targetDuration: string | null): PromptContext {
  return {
    dnaSections: null,
    formatLabel: 'Duygusal Hikâye',
    playbook: null,
    golds: [],
    references: [],
    input: {
      title: 'Başlık', topic: null, platform: null,
      targetDuration, draftText: null, sourceFacts: null,
    },
  };
}
const TARGET_LINE = /^# Kelime hedefi: (\d+)-(\d+) kelime/;
function targetLines(duration: string | null): string[] {
  return buildArhavalizePrompt(ctx(duration)).user.split('\n').filter((l) => TARGET_LINE.test(l));
}

eq('45 sn → tek kelime hedefi satırı',
  targetLines('45 sn'),
  ['# Kelime hedefi: 110-150 kelime (hedef süreden türetildi, ~170 kelime/dk seslendirme hızı)']);
eq('3 dk → doğru bant',
  targetLines('3 dk').map((l) => l.match(TARGET_LINE)!.slice(1, 3).join('-')), ['470-550']);

eq('tanınmayan sürede kelime hedefi satırı YOK', targetLines('4 dk'), []);
eq('süre yokken kelime hedefi satırı YOK', targetLines(null), []);

// Kelime hedefi, süre satırının hemen ardında ayrı bir satır olmalı.
{
  const lines = buildArhavalizePrompt(ctx('2.5 dk')).user.split('\n');
  const i = lines.findIndex((l) => l.startsWith('# Hedef süre/uzunluk:'));
  check('süre satırı var', i >= 0);
  check('kelime hedefi hemen altında', TARGET_LINE.test(lines[i + 1] ?? ''), lines[i + 1]);
}

// Süre girilmişse prompt'ta hâlâ görünür (hedef türetilemese bile).
check('tanınmayan süre yine de prompt\'a yazılır',
  buildArhavalizePrompt(ctx('4 dk')).user.includes('# Hedef süre/uzunluk: 4 dk'));

// Prompt biçimi değiştiği için sürüm ilerlemiş olmalı.
eq('prompt sürümü', PROMPT_VERSION, 'v4');

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
