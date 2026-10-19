/**
 * Motor → İçerik Planı teslim köprüsünün deterministik doğrulaması.
 *
 *   pnpm exec tsx scripts/check-voice-handoff.ts
 *
 * Veritabanına dokunmaz; yalnızca saf eşleme katmanını sınar. Bu eşleme
 * yanlışsa kart yanlış platformda ya da geçersiz formatla açılır — ikisi de
 * sessizce yanlış veri üretir, o yüzden burada kilitlenir.
 */

import {
  HANDOFF_LABELS,
  handoffNote,
  handoffTargetFor,
  voiceRequestNotification,
  type HandoffStage,
} from '../src/app/(dashboard)/motor/voice-handoff.constants';
import { DEFAULT_PLATFORM, PLATFORM_OPTIONS } from '../src/app/(dashboard)/motor/engine.constants';
import {
  CONTENT_FORMATS,
  PLATFORM_LABELS,
  deriveStage,
} from '../src/app/(dashboard)/icerik-plani/content-queue.constants';

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

// ── 1. Her motor platformu geçerli bir karta eşlenir ────────────────────────

for (const opt of PLATFORM_OPTIONS) {
  const target = handoffTargetFor(opt.value);
  check(`${opt.value}: en az bir platform`, target.platforms.length > 0, target);
  check(
    `${opt.value}: platformlar kart listesinde`,
    target.platforms.every((p) => p in PLATFORM_LABELS),
    target.platforms
  );
  check(
    `${opt.value}: format İçerik Planı listesinde`,
    (CONTENT_FORMATS as readonly string[]).includes(target.contentType),
    target.contentType
  );
}

eq('REELS → Instagram / Reels', handoffTargetFor('REELS'), {
  platforms: ['INSTAGRAM'], contentType: 'Short / Reels',
});
eq('SHORTS → YouTube / Reels', handoffTargetFor('SHORTS'), {
  platforms: ['YOUTUBE'], contentType: 'Short / Reels',
});
eq('YOUTUBE_LONG → YouTube / Video', handoffTargetFor('YOUTUBE_LONG'), {
  platforms: ['YOUTUBE'], contentType: 'Video',
});
eq('X → X / Tweet', handoffTargetFor('X'), {
  platforms: ['X'], contentType: 'Tweet / Thread',
});

// Platformsuz metin motorun varsayılanına düşer — iki ayrı varsayılan olmasın.
eq('platform yoksa motorun varsayılanı',
  handoffTargetFor(null), handoffTargetFor(DEFAULT_PLATFORM));

// ── 2. Kartın doğduğu aşama: Ses ────────────────────────────────────────────
// Teslim edilen kart has_text=true ile açılır. Metin bitmiştir; sıradaki iş
// seslendirmedir. Bu bozulursa kart "Metin Yazılıyor" kolonunda kalır ve
// seslendirmen onu hiç göremez.

eq('teslim edilen kart Ses aşamasında doğar',
  deriveStage({ status: 'HAZIRLANIYOR', has_text: true, has_voice: false, has_video: false }),
  'SES');
eq('ses linki gelince Kurgu aşamasına geçer',
  deriveStage({ status: 'HAZIRLANIYOR', has_text: true, has_voice: true, has_video: false }),
  'EDITOR');

// ── 3. Not satırı ───────────────────────────────────────────────────────────

eq('not: format + süre',
  handoffNote({ format_label: 'Duygusal Hikâye', target_duration: '2 dk' }),
  'Motor · Duygusal Hikâye · 2 dk');
eq('not: yalnız format',
  handoffNote({ format_label: 'Oyuncu Hikâyesi', target_duration: null }),
  'Motor · Oyuncu Hikâyesi');
eq('not: ikisi de yoksa yalnız kaynak',
  handoffNote({ format_label: null, target_duration: null }),
  'Motor');

// ── 4. Bildirim ─────────────────────────────────────────────────────────────

const notice = voiceRequestNotification('Soulfly');
check('bildirim başlığı seslendirmeyi söyler', notice.title.includes('Seslendirme'), notice.title);
check('bildirim gövdesi içerik adını taşır', notice.body.includes('Soulfly'), notice.body);

// ── 5. Durum etiketleri eksiksiz ────────────────────────────────────────────

const stages: HandoffStage[] = ['SES', 'EDITOR', 'HAZIR', 'YAYINLANDI'];
check('her aşamanın etiketi var',
  stages.every((s) => Boolean(HANDOFF_LABELS[s])), HANDOFF_LABELS);

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
