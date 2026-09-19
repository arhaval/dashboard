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
  HOOK_ALTERNATIVE_COUNT,
  applyHook,
  coerceHookAlternatives,
  findAppliedHook,
  coerceTag,
  readVarietyTags,
  wordTargetFor,
  type DurationOption,
  type HookAlternative,
} from '../src/app/(dashboard)/motor/engine.constants';
import {
  HOOK_MAX_WORDS,
  checkGeneratedText,
  connectorLimitFor,
  splitSentences,
} from '../src/app/(dashboard)/motor/text-guard.constants';
import {
  buildArhavalizePrompt,
  buildClassifyPrompt,
  type PromptContext,
} from '../src/services/ai-engine.prompt';
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
eq('prompt sürümü', PROMPT_VERSION, 'v8');

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

// ── Hook seçenekleri ────────────────────────────────────────────────────────

eq("seçenek sayısı üçtür", HOOK_ALTERNATIVE_COUNT, 3);

const RAW3 = [
  { family: "sahne", hook: "Bir stadyum, boş tribün.", thesis: "O tribünü dolduran tek adam oydu." },
  { family: "Çıplak Sayı", hook: "18,9.", thesis: "Bu sayı bir şehrin fikrini değiştirdi." },
  { family: "soru", hook: "Bu adam neden gitti?", thesis: "Herkes bu soruya aynı cevabı veriyor." },
];
eq("geçerli üçlü aynen geçer",
  coerceHookAlternatives(RAW3).map((a) => a.family), ["sahne", "çıplak sayı", "soru"]);
eq("hook ve tez birlikte korunur", coerceHookAlternatives(RAW3)[2],
  { family: "soru", hook: "Bu adam neden gitti?", thesis: "Herkes bu soruya aynı cevabı veriyor." });

eq("sözlük dışı aile elenir",
  coerceHookAlternatives([{ family: "metafor", hook: "x", thesis: "y" }, RAW3[0]]).map((a) => a.family), ["sahne"]);
eq("boş hook elenir", coerceHookAlternatives([{ family: "sahne", hook: "   ", thesis: "y" }]), []);
eq("tezsiz seçenek elenir", coerceHookAlternatives([{ family: "sahne", hook: "x", thesis: "  " }]), []);
// Eski kayıt biçimi ({family, text}) tez taşımıyor: tek başına hook değiştirmek düzeltilen hataydı.
eq("eski biçim (text) elenir", coerceHookAlternatives([{ family: "sahne", text: "Bir stadyum." }]), []);
eq("aynı aileden ikinci seçenek elenir",
  coerceHookAlternatives([RAW3[0], { family: "sahne", hook: "başka", thesis: "tez" }, RAW3[2]])
    .map((a) => a.family), ["sahne", "soru"]);
eq("dördüncü seçenek alınmaz",
  coerceHookAlternatives([...RAW3, { family: "aforizma", hook: "dört", thesis: "tez" }]).length, 3);
eq("dizi olmayan girdi → boş", coerceHookAlternatives("sahne"), []);
eq("null → boş", coerceHookAlternatives(null), []);
eq("hook ve tez kırpılır",
  coerceHookAlternatives([{ family: "soru", hook: "  Neden?  ", thesis: "  Çünkü.  " }])[0],
  { family: "soru", hook: "Neden?", thesis: "Çünkü." });

// applyHook: hook + tez BİRLİKTE değişir. Eşleşme yoksa TAHMİN YÜRÜTÜLMEZ.
const ALTS: HookAlternative[] = coerceHookAlternatives(RAW3);
const BODY = " Devamı burada. Son cümle.";
const opening = (a: HookAlternative, sep = " ") => a.hook + sep + a.thesis;

// Asıl hata: "soru" hook'unun tezi "bu soruya" diye gönderme yapıyordu;
// "sahne" seçilince yalnız ilk cümle değişiyor, tez anlamsız kalıyordu.
{
  const r = applyHook(opening(ALTS[2]) + BODY, ALTS, ALTS[0]);
  check("hook ve tez birlikte değişir", r.ok);
  eq("yeni açılış + gövde korunur", r.text, opening(ALTS[0]) + BODY);
  check("eski hooka gönderme yapan tez kalmaz", !r.text.includes("bu soruya"));
}
{
  const r = applyHook(opening(ALTS[1]) + BODY, ALTS, ALTS[1]);
  check("aynı seçenek seçilince değişmez", r.ok);
  eq("metin aynı kalır", r.text, opening(ALTS[1]) + BODY);
}
{
  const r = applyHook(opening(ALTS[0], "\n") + BODY, ALTS, ALTS[1]);
  eq("hook ile tez arasındaki satır sonu korunur", r.text, opening(ALTS[1], "\n") + BODY);
}
{
  // Hook yerinde ama tez elle değiştirilmiş: yeni tezi üstüne yazmak düzeltmeyi silerdi.
  const elle = ALTS[0].hook + " Elle yazılmış bir tez." + BODY;
  const r = applyHook(elle, ALTS, ALTS[1]);
  check("tez elle değiştiyse uygulanmaz", !r.ok);
  eq("metne dokunulmaz", r.text, elle);
}
check("hook elle değiştiyse uygulanmaz",
  !applyHook("Kullanıcı hooku elle yazdı. " + ALTS[0].thesis + BODY, ALTS, ALTS[1]).ok);
{
  const r = applyHook("\n  " + opening(ALTS[0]) + BODY, ALTS, ALTS[1]);
  check("baştaki boşluk eşleşmeyi bozmaz", r.ok);
  eq("boşluk kırpılarak yeni açılış yazılır", r.text, opening(ALTS[1]) + BODY);
}
eq("seçenek yokken uygulanamaz", applyHook("metin", [], ALTS[0]).ok, false);

// findAppliedHook: panel hangi seçeneği "uygulandı" gösterecek.
eq("uygulanan seçenek bulunur", findAppliedHook(opening(ALTS[2]) + BODY, ALTS)?.family, "soru");
eq("tez elle değiştiyse hiçbiri uygulanmış sayılmaz",
  findAppliedHook(ALTS[2].hook + " Başka bir tez." + BODY, ALTS), null);

// Prompt sözleşmesi
{
  const sys = withRecent([]);
  check("hook_alternatives JSON alanı istenir", sys.includes('"hook_alternatives"'));
  check("her seçenekte hook alanı istenir", sys.includes('"hook": '));
  check("her seçenekte tez alanı istenir", sys.includes('"thesis": '));
  check("üç farklı aile şartı yazılı", sys.includes("FARKLI bir kanca ailesinden"));
  check("tez kuralı kullanıcının yazdığı gibi",
    sys.includes("Her hook alternatifi kendi tez cümlesiyle birlikte üretilir. Tez cümlesi başka bir hook'a gönderme yapamaz."));
  check("açılış (hook + tez) birebir şartı yazılı", sys.includes("BİREBİR aynı metin"));
  check("seçenek sayısı prompta geçer", sys.includes(`tam ${HOOK_ALTERNATIVE_COUNT} seçenek`));
}

// ── Sınıflandırma prompt'u ──────────────────────────────────────────────────

const DNA_STUB = {
  hook_logic: 'Dört kanca ailesi: aforizma, çıplak sayı, sahne, soru.',
  payoff: 'Üç tipi: dönüş, isimlendirme, ters çevirme.',
  cta: 'Aynı CTA tipi art arda kullanılmaz.',
  voice: 'Bu bölüm sınıflandırmaya girmemeli.',
};

{
  const { system, user } = buildClassifyPrompt(DNA_STUB, '  Bir stadyum. Devamı.  ');
  check('hook tanımı DNA dan gelir', system.includes(DNA_STUB.hook_logic));
  check('payoff tanımı DNA dan gelir', system.includes(DNA_STUB.payoff));
  check('cta tanımı DNA dan gelir', system.includes(DNA_STUB.cta));
  check('ilgisiz DNA bölümü taşınmaz', !system.includes(DNA_STUB.voice));

  for (const h of HOOK_FAMILIES) check(`sınıflandırmada hook seçeneği: ${h}`, system.includes(h));
  for (const pt of PAYOFF_TYPES) check(`sınıflandırmada payoff seçeneği: ${pt}`, system.includes(pt));
  for (const c of CTA_TYPES) check(`sınıflandırmada CTA seçeneği: ${c}`, system.includes(c));

  check('emin değilsen null kuralı var', system.includes('null bırak'));
  check('liste dışı değer yasağı var', system.includes('dışında bir değer üretme'));
  check('sadece JSON istenir', system.includes('Yalnızca şu JSON yapısında'));
  check('metni yeniden yazma yasağı var', system.includes('yeniden yazma'));

  eq('metin user mesajında ve kırpılmış', user, '## ETİKETLENECEK METİN\nBir stadyum. Devamı.');
}

// DNA boşsa tanım başlıkları yazılmaz ama seçenekler yine dayatılır.
{
  const { system } = buildClassifyPrompt(null, 'metin');
  check('tanımsız DNA da hook başlığı yok', !system.includes('HOOK MANTIĞI'));
  check('tanımsız DNA da seçenekler yine var', system.includes('hook_family: '));
}
{
  const { system } = buildClassifyPrompt({ hook_logic: '   ', payoff: 'x' }, 'metin');
  check('boş DNA bölümü başlık açtırmaz', !system.includes('HOOK MANTIĞI'));
  check('dolu DNA bölümü başlık açar', system.includes('PAYOFF MANTIĞI'));
}

// ── MUTLAK KURALLAR: sürekli çiğnenen iki kural ─────────────────────────────
// İkisi DNA'nın avoid/voice bölümlerinde de yazılı. Prompt'ta geride kaldıkları
// için ağırlıklandırılmıyorlardı; MUTLAK KURALLAR'da TEKRARLANMALARI kasıtlı.

{
  const sys = withRecent([]);
  const rules = sys.slice(sys.indexOf('## MUTLAK KURALLAR'), sys.indexOf('## ÇIKTI BİÇİMİ'));

  check('7. kural mutlak kurallarda', rules.includes('7. Payoff'));
  check('8. kural mutlak kurallarda', rules.includes('8. Konuşma bağlaçları'));

  for (const kalip of [
    'yeni bir hikâye başladı',
    'yeniden yazılmaya başladı',
    'zaman gösterecek',
    'devamı gelecek',
  ]) {
    check(`yasak kapanış örneklendi: ${kalip}`, rules.includes(kalip));
  }

  for (const esik of ['en fazla 1', 'en fazla 2', 'en fazla 3']) {
    check(`bağlaç sınırı yazılı: ${esik}`, rules.includes(esik));
  }
  check('sınır TOPLAMDA sayılır diyor', rules.includes('TOPLAMDA'));
  check('60 saniye eşiği yazılı', rules.includes('60 saniyenin altında'));
  check('60-120 aralığı yazılı', rules.includes('60-120 saniye'));
}

// avoid/voice'taki asıl kurallar DNA'dan gelir; prompt onları SİLMEZ.
{
  const sys = buildArhavalizePrompt({
    ...ctx('60 sn'),
    dnaSections: {
      avoid: 'AVOID-ISARETI klişe kapanış yasağı',
      voice: 'VOICE-ISARETI bağlaç kullanımı',
    },
  }).system;
  check('DNA avoid bölümü prompta taşınır', sys.includes('AVOID-ISARETI'));
  check('DNA voice bölümü prompta taşınır', sys.includes('VOICE-ISARETI'));
}

// ── Deterministik metin denetimi ────────────────────────────────────────────

eq("30 sn eşiği", connectorLimitFor("30 sn"), 1);
eq("45 sn eşiği", connectorLimitFor("45 sn"), 1);
eq("60 sn eşiği (sınır dahil)", connectorLimitFor("60 sn"), 2);
eq("90 sn eşiği", connectorLimitFor("90 sn"), 2);
eq("2 dk eşiği (üst sınır dahil)", connectorLimitFor("2 dk"), 2);
eq("2.5 dk eşiği", connectorLimitFor("2.5 dk"), 3);
eq("3 dk eşiği", connectorLimitFor("3 dk"), 3);

// Süre bilinmiyorsa eşik UYDURULMAZ.
eq("tablo dışı süre → eşik yok", connectorLimitFor("4 dk"), null);
eq("süre yok → eşik yok", connectorLimitFor(null), null);

eq("cümlelere bölme",
  splitSentences("Bir. İki!  Üç?  "), ["Bir.", "İki!", "Üç?"]);
eq("boş metin → cümle yok", splitSentences("   "), []);

// Üç kategori TOPLAMDA sayılır.
{
  const t = "Bakın şu rakama. Hatta daha fazlası var. Dikkat edin buraya.";
  const r = checkGeneratedText(t, "30 sn");
  eq("toplam sayım", r.connectors.count, 3);
  eq("eşik metne göre", r.connectors.limit, 1);
  check("eşik aşıldı", r.connectors.over);
  check("uyarı var", r.hasWarning);
  eq("bulunanların etiketleri",
    r.connectors.hits.map((h) => h.label).sort(),
    ['"bakın"', '"dikkat edin"', '"hatta"'].sort());
  check("bulunan cümle raporlanır",
    r.connectors.hits.some((h) => h.sentence === "Hatta daha fazlası var."));
}

// Eşiğin altında kalırsa uyarı YOK.
{
  const r = checkGeneratedText("Bakın şu rakama. Gerisi sade.", "3 dk");
  eq("sayım", r.connectors.count, 1);
  check("eşik aşılmadı", !r.connectors.over);
  check("uyarı yok", !r.hasWarning);
}

// Süre tanınmıyorsa sayım yapılır ama ihlal İDDİA EDİLMEZ.
{
  const r = checkGeneratedText("Bakın. Hatta. Dikkat edin. Ya tamam.", "kısa olsun");
  check("sayım yine yapılır", r.connectors.count >= 4);
  eq("eşik yok", r.connectors.limit, null);
  check("ihlal iddia edilmez", !r.connectors.over);
  check("uyarı yok", !r.hasWarning);
}

// Cümle başı "E" bağlacı sayılır; kelime içindeki e sayılmaz.
{
  const r = checkGeneratedText("E kader sever bunu.", "30 sn");
  eq("cümle başı E sayıldı", r.connectors.count, 1);
}
{
  const r = checkGeneratedText("Evet, elbette her şey yolunda.", "30 sn");
  eq("kelime içi e sayılmaz", r.connectors.count, 0);
  check("temiz metinde uyarı yok", !r.hasWarning);
}
{
  const r = checkGeneratedText("Hattayı geçtik.", "30 sn");
  eq("hatta kelimenin parçasıysa sayılmaz", r.connectors.count, 0);
}

// Klişe kapanış YALNIZCA son cümlede aranır.
{
  const r = checkGeneratedText("Bir metin. Zaman gösterecek.", "3 dk");
  eq("son cümlede klişe bulundu", r.clichePayoff.hits.length, 1);
  eq("son cümle raporlanır", r.clichePayoff.lastSentence, "Zaman gösterecek.");
  check("uyarı var", r.hasWarning);
}
{
  const r = checkGeneratedText("Zaman gösterecek. Asıl mesele başka.", "3 dk");
  eq("son cümle dışındaki klişe sayılmaz", r.clichePayoff.hits.length, 0);
  check("uyarı yok", !r.hasWarning);
}
for (const kapanis of [
  "Onun için yeni bir hikâye başladı.",
  "Tarih yeniden yazılmaya başladı.",
  "Bunu zaman gösterecek.",
  "Devamı gelecek.",
]) {
  const r = checkGeneratedText("Giriş cümlesi. " + kapanis, "3 dk");
  check(`klişe yakalandı: ${kapanis}`, r.clichePayoff.hits.length === 1);
}

// Aksan/büyük harf farkı eşleşmeyi bozmaz.
{
  const r = checkGeneratedText("Giriş. BUNU ZAMAN GOSTERECEK.", "3 dk");
  eq("aksansız ve büyük harf yakalanır", r.clichePayoff.hits.length, 1);
}

// Boş metin hiçbir şey iddia etmez.
{
  const r = checkGeneratedText("", "30 sn");
  eq("boş metin sayımı", r.connectors.count, 0);
  eq("boş metinde son cümle yok", r.clichePayoff.lastSentence, null);
  check("boş metinde uyarı yok", !r.hasWarning);
}

// Sonradan eklenen kendi kendine itiraz kalıpları.
for (const [kalip, cumle] of [
  ["peki", "Peki bu ne anlama geliyor?"],
  ["ama şu ne", "Tamam ama şu ne olacak?"],
  ["değil mi", "Zaman ne hızlı geçiyor değil mi?"],
  ["sizce", "Sizce bu yeterli mi?"],
] as const) {
  const r = checkGeneratedText(cumle, "3 dk");
  eq(`kalıp sayıldı: ${kalip}`, r.connectors.count, 1);
  check(`kalıp raporlandı: ${kalip}`, r.connectors.hits[0]?.label.includes(kalip));
}

// Kelimenin parçasıysa sayılmaz.
for (const cumle of ["Pekiştirmek gerekiyor.", "Sizcesi böyle."]) {
  eq(`kelime içi sayılmaz: ${cumle}`, checkGeneratedText(cumle, "3 dk").connectors.count, 0);
}
eq('"değil miydi" sayılmaz',
  checkGeneratedText("Öyle değil miydi?", "3 dk").connectors.count, 0);

// ── Hook uzunluğu: 3 saniye sınırı ──────────────────────────────────────────
// DNA hook_logic: ilk cümle seslendirmede 3 saniyeyi geçmez, en fazla 8-10
// kelime. Denetim yalnızca bildirir; onaylamayı engellemez.

{
  const kisa = "Dani Olmo neden Barcelona'yı bıraktı?";
  const r = checkGeneratedText(kisa + " Devamı burada.", "3 dk");
  eq("kısa hook kelime sayısı", r.hook.words, 5);
  check("kısa hook sınırı aşmaz", !r.hook.over);
  check("kısa hookta uyarı yok", !r.hasWarning);
}
{
  const uzun = "Bazen hayatta bizim için neyin daha iyi olacağını hiçbir zaman bilemeyiz.";
  const r = checkGeneratedText(uzun + " Devamı burada.", "3 dk");
  eq("uzun hook kelime sayısı", r.hook.words, 11);
  check("sınır aşılınca işaretlenir", r.hook.over);
  eq("sınır on kelime", r.hook.limit, HOOK_MAX_WORDS);
  eq("uyarıda gösterilecek cümle ilk cümledir", r.hook.sentence, uzun);
  check("uyarı üretilir", r.hasWarning);
}
{
  // Tam sınırda uyarı yok: 8-10 bandının üst ucu geçerli sayılır.
  const tam = "Bir iki üç dört beş altı yedi sekiz dokuz on.";
  const r = checkGeneratedText(tam, "3 dk");
  eq("on kelime sayılır", r.hook.words, 10);
  check("tam sınırda uyarı yok", !r.hook.over);
}
{
  // Satır sonu ve fazla boşluk kelime sayısını şişirmez.
  const r = checkGeneratedText("Bir  iki\n  üç dört.", "3 dk");
  eq("boşluklar sayıya karışmaz", r.hook.words, 4);
}
eq("boş metinde hook raporu boş",
  checkGeneratedText("", "3 dk").hook, { words: null, limit: HOOK_MAX_WORDS, over: false, sentence: null });

// Hook uzunluğu diğer kuralların sonucunu değiştirmez.
{
  const r = checkGeneratedText("Bazen hayatta bizim için neyin daha iyi olacağını hiçbir zaman bilemeyiz. Gerisi sade.", "3 dk");
  check("uzun hook bağlaç sayımını etkilemez", r.connectors.count === 0);
  check("uzun hook klişe kapanış üretmez", r.clichePayoff.hits.length === 0);
}

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
