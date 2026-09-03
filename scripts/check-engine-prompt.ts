/**
 * İçerik Motoru — kelime hedefi, prompt biçimi ve öğrenme sayımları doğrulaması.
 *
 *   pnpm exec tsx scripts/check-engine-prompt.ts
 *
 * Veritabanına dokunmaz; yalnızca saf katmanı (süre→kelime türetme + prompt
 * kurucu) sınar.
 */

import {
  CTA_TYPES,
  DURATION_OPTIONS,
  HOOK_FAMILIES,
  PAYOFF_TYPES,
  PROMPT_VERSION,
  WORD_TARGETS,
  coerceTag,
  readVarietyTags,
  wordTargetFor,
  type DurationOption,
} from '../src/app/(dashboard)/motor/engine.constants';
import { buildArhavalizePrompt, type PromptContext } from '../src/services/ai-engine.prompt';
import type { EditSignalDTO } from '../src/app/(dashboard)/motor/engine.constants';
import {
  NO_FORMAT_LABEL,
  countByFormat,
  formatDelta,
  signalDelta,
  wordCount,
} from '../src/app/(dashboard)/motor/ogrenme/learning.constants';

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
    recentTags: [],
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
eq('prompt sürümü', PROMPT_VERSION, 'v5');

// ── Öğrenme sinyalleri ──────────────────────────────────────────────────────

function sig(p: Partial<EditSignalDTO>): EditSignalDTO {
  return {
    id: p.id ?? 'x', script_id: null, script_title: null,
    format_id: p.format_id ?? null, format_label: p.format_label ?? null,
    ai_text: p.ai_text ?? null, final_text: p.final_text ?? null,
    edit_reason: p.edit_reason ?? null, dna_version: null, format_version: null,
    prompt_version: null, created_at: '2026-09-03T00:00:00Z',
  };
}

eq('sinyal yokken sayım boş', countByFormat([]), []);

{
  const rows = countByFormat([
    sig({ format_id: 'a', format_label: 'Duygusal Hikâye', edit_reason: 'hook uzundu' }),
    sig({ format_id: 'b', format_label: 'Taktik Analiz' }),
    sig({ format_id: 'a', format_label: 'Duygusal Hikâye' }),
    sig({ format_id: 'a', format_label: 'Duygusal Hikâye', edit_reason: '   ' }),
    sig({}),
  ]);
  eq('format başına sayım, çoktan aza',
    rows.map((r) => [r.label, r.count, r.withReason]),
    [['Duygusal Hikâye', 3, 1], [NO_FORMAT_LABEL, 1, 0], ['Taktik Analiz', 1, 0]]);
  check('formatsız sinyal gizlenmez', rows.some((r) => r.formatId === null));
  eq('toplam sayım sinyal sayısına eşit', rows.reduce((n, r) => n + r.count, 0), 5);
  check('yalnız boşluktan ibaret gerekçe sayılmaz', rows[0].withReason === 1);
}

// Metin yoksa 0 değil null — "sıfır kelime" ile "metin yok" aynı şey değildir.
eq('kelime sayısı', wordCount('  bir  iki üç '), 3);
eq('boş metin → null', wordCount('   '), null);
eq('null metin → null', wordCount(null), null);

eq('üretim varken fark hesaplanır',
  signalDelta(sig({ ai_text: 'a b c d', final_text: 'a b' })), { ai: 4, final: 2, diff: -2 });
eq('üretim yokken fark null',
  signalDelta(sig({ final_text: 'a b' })), { ai: null, final: 2, diff: null });

eq('artı fark işaretli', formatDelta(12), '+12');
eq('eksi fark işaretli', formatDelta(-7), '−7');
eq('sıfır fark', formatDelta(0), '0');
eq('hesaplanamayan fark → null', formatDelta(null), null);

// ── Çeşitlilik etiketleri ───────────────────────────────────────────────────

eq('sözlükler DNA ile aynı', [HOOK_FAMILIES.length, PAYOFF_TYPES.length, CTA_TYPES.length], [4, 3, 4]);
check('CTA sozlugunde "yok" var — DNA CTA kullanilmayan metne izin veriyor', CTA_TYPES.includes('yok'));

for (const h of HOOK_FAMILIES) eq(`hook birebir tanınır: ${h}`, coerceTag(HOOK_FAMILIES, h), h);
eq('büyük harf toleransı', coerceTag(HOOK_FAMILIES, 'SAHNE'), 'sahne');
eq('aksansız yazım toleransı', coerceTag(HOOK_FAMILIES, 'ciplak sayi'), 'çıplak sayı');
eq('fazla boşluk toleransı', coerceTag(PAYOFF_TYPES, '  ters   çevirme '), 'ters çevirme');

// Sözlük dışı değer UYDURULMAZ — yanlış etiket çeşitliliği sessizce bozar.
eq('sözlük dışı → null', coerceTag(HOOK_FAMILIES, 'metafor'), null);
eq('boş → null', coerceTag(HOOK_FAMILIES, '  '), null);
eq('string olmayan → null', coerceTag(HOOK_FAMILIES, 42), null);
eq('undefined → null', coerceTag(HOOK_FAMILIES, undefined), null);

eq('satırdan etiket okuma',
  readVarietyTags({ hook_family: 'Sahne', payoff_type: 'uydurma', cta_type: 'yok' }),
  { hookFamily: 'sahne', payoffType: null, ctaType: 'yok' });
eq('boş satır → hepsi null',
  readVarietyTags({}), { hookFamily: null, payoffType: null, ctaType: null });

// ── Prompt: çeşitlilik bölümü ───────────────────────────────────────────────

function withRecent(recent: PromptContext['recentTags']): string {
  return buildArhavalizePrompt({ ...ctx('60 sn'), recentTags: recent }).system;
}
const VARIETY_HEAD = '## ÇEŞİTLİLİK';

check('kayıt yokken çeşitlilik bölümü yazılmaz', !withRecent([]).includes(VARIETY_HEAD));
check('etiketi boş finaller bölüm açtırmaz',
  !withRecent([
    { title: 'A', tags: { hookFamily: null, payoffType: null, ctaType: null } },
  ]).includes(VARIETY_HEAD));

{
  const sys = withRecent([
    { title: 'Bir Çocuğun Rüyası', tags: { hookFamily: 'sahne', payoffType: 'dönüş', ctaType: 'yok' } },
    { title: 'Lukaku', tags: { hookFamily: 'soru', payoffType: null, ctaType: null } },
  ]);
  check('çeşitlilik bölümü açılır', sys.includes(VARIETY_HEAD));
  check('final başlığı listelenir', sys.includes('1. Bir Çocuğun Rüyası'));
  check('kullanılan hook listelenir', sys.includes('hook: sahne'));
  check('bilinmeyen alan tire ile gösterilir', sys.includes('payoff: —'));
  check('tekrarlama talimatı var', sys.includes('TEKRARLAMA'));
}

// Çıktı biçimi üç etiketi de sözlüğüyle birlikte dayatmalı.
{
  const sys = withRecent([]);
  check('hook_family JSON alanı istenir', sys.includes('"hook_family"'));
  check('payoff_type JSON alanı istenir', sys.includes('"payoff_type"'));
  check('cta_type JSON alanı istenir', sys.includes('"cta_type"'));
  for (const h of HOOK_FAMILIES) check(`izinli hook prompt'ta: ${h}`, sys.includes(h));
  for (const pt of PAYOFF_TYPES) check(`izinli payoff prompt'ta: ${pt}`, sys.includes(pt));
  for (const c of CTA_TYPES) check(`izinli CTA prompt'ta: ${c}`, sys.includes(c));
  check('etikete uydurma yasağı var', sys.includes('Metni etikete uydurma'));
}

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
