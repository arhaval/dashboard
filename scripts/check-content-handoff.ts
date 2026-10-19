/**
 * "Metni yaz, seçtiğin kişiye gitsin" akışının deterministik doğrulaması.
 *
 *   pnpm exec tsx scripts/check-content-handoff.ts
 *
 * Veritabanına dokunmaz. Formun ve sunucu eyleminin ORTAK kullandığı saf
 * kararı sınar: kart hangi durumda doğrudan seslendirmene gider, hangi
 * durumda taslak kalır. Bu karar bozulursa ya kart kimseye gitmeden kaybolur
 * ya da metni olmayan bir kart için insan boşuna uyandırılır.
 */

import {
  csvFileName,
  daysWaiting,
  decideHandoff,
  deriveStage,
  isOverdue,
  staleLevel,
  toCsv,
  voiceRequestNotification,
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

const METE = 'mete-id';

// ── 1. Metin + kişi = gider ─────────────────────────────────────────────────

eq('metin ve kişi varsa doğrudan gönderilir',
  decideHandoff({ text: 'Bir zamanlar XANTARES...', assigneeId: METE }),
  { hasText: true, assignedTo: METE, notify: true, blocked: null });

// ── 2. Kişi yoksa taslak kalır ──────────────────────────────────────────────

eq('kişi seçilmediyse kimseye gitmez',
  decideHandoff({ text: 'Metin var ama kişi yok', assigneeId: null }),
  { hasText: false, assignedTo: null, notify: false, blocked: 'NO_PERSON' });

eq('kişi yoksa formdaki "metin yazıldı" kutusu korunur',
  decideHandoff({ text: 'Metin', assigneeId: '', hasTextChecked: true }),
  { hasText: true, assignedTo: null, notify: false, blocked: 'NO_PERSON' });

// ── 3. Metin yoksa gönderilmez ──────────────────────────────────────────────
// Metni olmayan kart seslendirmene gitmez: adam kartı açıp okuyacak bir şey
// bulamazdı. Kişi seçimi korunur ki kullanıcı metni yazıp tekrar basabilsin.

eq('metin boşsa gönderilmez, engel bildirilir',
  decideHandoff({ text: '', assigneeId: METE }),
  { hasText: false, assignedTo: METE, notify: false, blocked: 'NO_TEXT' });

eq('yalnız boşluktan oluşan metin de boş sayılır',
  decideHandoff({ text: '   \n  ', assigneeId: METE }).blocked,
  'NO_TEXT');

eq('null metin boş sayılır',
  decideHandoff({ text: null, assigneeId: METE }).blocked,
  'NO_TEXT');

// ── 4. Kişi kimliğinin başındaki/sonundaki boşluk sayılmaz ──────────────────

eq('boşluktan oluşan kişi kimliği seçilmemiş sayılır',
  decideHandoff({ text: 'Metin', assigneeId: '   ' }).blocked,
  'NO_PERSON');

// ── 5. Gönderilen kart Ses adımında doğar ───────────────────────────────────
// decideHandoff'un hasText=true demesi, kartın "Metin Yazılıyor" kolonunu
// atlayıp doğrudan "Ses Bekleniyor"da açılması anlamına gelir. İki katman
// burada birlikte sınanır: biri değişirse diğeri yakalanır.

const sent = decideHandoff({ text: 'Metin', assigneeId: METE });
eq('gönderilen kart Ses kolonunda açılır',
  deriveStage({ status: 'HAZIRLANIYOR', has_text: sent.hasText, has_voice: false, has_video: false }),
  'SES');

const draft = decideHandoff({ text: 'Metin', assigneeId: null });
eq('taslak kart Metin kolonunda kalır',
  deriveStage({ status: 'HAZIRLANIYOR', has_text: draft.hasText, has_voice: false, has_video: false }),
  'METIN');

eq('ses linki gelince Kurgu aşamasına geçer',
  deriveStage({ status: 'HAZIRLANIYOR', has_text: true, has_voice: true, has_video: false }),
  'EDITOR');

// ── 6. Takip ölçüleri: ne kadar bekliyor, gecikti mi ────────────────────────
// Liste görünümünün "hangi iş takıldı" sinyali bunlar. Yanlış hesaplanırsa
// takılı iş normal görünür — takip merkezinin tek işi bunu göstermek.

const NOW = new Date('2026-10-19T12:00:00Z');

eq('aynı gün hareket = 0 gün', daysWaiting('2026-10-19T09:00:00Z', NOW), 0);
eq('dün hareket = 1 gün',      daysWaiting('2026-10-18T09:00:00Z', NOW), 1);
eq('on gün önce = 10 gün',     daysWaiting('2026-10-09T09:00:00Z', NOW), 10);
eq('tarih yoksa null',         daysWaiting(null, NOW), null);
eq('geçersiz tarih null',      daysWaiting('bozuk', NOW), null);
// Saat farkından negatif gün çıkmasın.
eq('gelecek tarih 0 gün',      daysWaiting('2026-10-20T09:00:00Z', NOW), 0);

eq('6 gün normal',      staleLevel(6), 'OK');
eq('7 gün dikkat',      staleLevel(7), 'WARN');
eq('13 gün dikkat',     staleLevel(13), 'WARN');
eq('14 gün geç kaldı',  staleLevel(14), 'LATE');
eq('ölçülemeyen normal', staleLevel(null), 'OK');

eq('planlanan gün geçti, yayınlanmadı → gecikme',
  isOverdue('2026-10-18', 'SES', '2026-10-19'), true);
eq('bugün planlı → gecikme değil',
  isOverdue('2026-10-19', 'SES', '2026-10-19'), false);
eq('yayınlanan içerik gecikmez',
  isOverdue('2026-09-01', 'YAYINLANDI', '2026-10-19'), false);
eq('tarihi olmayan kart gecikmez',
  isOverdue(null, 'SES', '2026-10-19'), false);

// ── 7. E-tablo çıktısı ──────────────────────────────────────────────────────
// Kaçış bozulursa bir not satırındaki noktalı virgül bütün sütunları kaydırır
// ve editöre yanlış tablo gider — hata ekranda görünmez, dosyada görünür.

const csv = toCsv(['Başlık', 'Not'], [['Woxic masa', 'kısa olsun']]);
const lines = csv.split('\r\n');
eq('ilk satır başlıklar', lines[0], '﻿Başlık;Not');
eq('veri satırı noktalı virgülle ayrılır', lines[1], 'Woxic masa;kısa olsun');
check('dosya BOM ile başlar', csv.startsWith('﻿'), csv.slice(0, 3));
check('satır sonu CRLF', csv.includes('\r\n'), true);

eq('ayırıcı içeren hücre tırnaklanır',
  toCsv(['A'], [['bir;iki']]).split('\r\n')[1], '"bir;iki"');
eq('tırnak içeren hücrede tırnak ikilenir',
  toCsv(['A'], [['o "efsane" an']]).split('\r\n')[1], '"o ""efsane"" an"');
eq('satır sonu içeren hücre tırnaklanır',
  toCsv(['A'], [['birinci\nikinci']]).split('\r\n')[1], '"birinci\nikinci"');
eq('boş hücreler boş kalır', toCsv(['A', 'B'], [[null, '']]).split('\r\n')[1], ';');
eq('sayı hücresi yazıya çevrilir', toCsv(['A'], [[11]]).split('\r\n')[1], '11');

check('dosya adı tarih taşır', csvFileName('2026-10-19').includes('2026-10-19'), csvFileName('2026-10-19'));
check('dosya adı .csv uzantılı', csvFileName('2026-10-19').endsWith('.csv'), csvFileName('2026-10-19'));

// ── 8. Bildirim metni ───────────────────────────────────────────────────────

const notice = voiceRequestNotification('Soulfly');
check('bildirim başlığı seslendirmeyi söyler', notice.title.includes('Seslendirme'), notice.title);
check('bildirim gövdesi içerik adını taşır', notice.body.includes('Soulfly'), notice.body);
check('bildirim ne yapılacağını söyler', notice.body.includes('link'), notice.body);

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
