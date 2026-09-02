/**
 * SRT temizleyici — deterministik doğrulama.
 *
 *   pnpm exec tsx scripts/check-srt-clean.ts
 *
 * Dosya sistemine ve veritabanına dokunmaz; yalnızca saf fonksiyonu sınar.
 */

import { cleanSubtitle, looksLikeSubtitle } from '../src/lib/srt-clean';

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

// ── Kayan altyazı (YouTube otomatik) ────────────────────────────────────────
// Her blok bir önceki bloğun satırını tekrar eder; sonuç tekrarsız olmalı.

const KAYAN = `1
00:00:00,080 --> 00:00:02,389

Bana sürekli sorulan bir soru.

2
00:00:02,389 --> 00:00:02,399
Bana sürekli sorulan bir soru.


3
00:00:02,399 --> 00:00:05,110
Bana sürekli sorulan bir soru.
Cevabı hiç değişmiyor.

4
00:00:05,110 --> 00:00:05,120
Cevabı hiç değişmiyor.


5
00:00:05,120 --> 00:00:07,150
Cevabı hiç değişmiyor.
Konfor başarının düşmanıdır.
`;

eq('kayan altyazı tekrarsız birleşir', cleanSubtitle(KAYAN),
  'Bana sürekli sorulan bir soru. Cevabı hiç değişmiyor. Konfor başarının düşmanıdır.');

check('zaman kodu kalmaz', !/-->/.test(cleanSubtitle(KAYAN)));
check('blok numarası kalmaz', !/(^|\s)\d+(\s|$)/.test(cleanSubtitle(KAYAN)));

// Kelime kelime büyüyen (progressive) altyazıda da tek kopya kalmalı.
eq('progressive altyazı tek kopyaya iner',
  cleanSubtitle('1\n00:00:01,000 --> 00:00:02,000\nBu bir\n\n2\n00:00:02,000 --> 00:00:03,000\nBu bir cümle\n\n3\n00:00:03,000 --> 00:00:04,000\nBu bir cümledir.\n'),
  'Bu bir cümledir.');

// ── Konuşma dışı işaretler ──────────────────────────────────────────────────
// Cümlenin ortasına giren [müzik] gibi notasyon modele ULAŞMAMALI.

eq('cümle içi [müzik] düşer',
  cleanSubtitle('1\n00:00:01,000 --> 00:00:02,000\ngetirmek [müzik] istiyor\n'),
  'getirmek istiyor');
eq('tek başına [müzik] satırı düşer',
  cleanSubtitle('1\n00:00:01,000 --> 00:00:02,000\n[müzik]\n\n2\n00:00:02,000 --> 00:00:03,000\nMerhaba.\n'),
  'Merhaba.');
eq('[Alkış] / [Applause] düşer',
  cleanSubtitle('1\n00:00:01,000 --> 00:00:02,000\n[Alkış] Tamam [Applause] bitti.\n'),
  'Tamam bitti.');
eq('konuşmacı işareti düşer',
  cleanSubtitle('1\n00:00:01,000 --> 00:00:02,000\n>> Evlat bana bir söz ver.\n'),
  'Evlat bana bir söz ver.');

// Konuşma dışı OLMAYAN köşeli parantez korunur — anlam taşıyabilir.
eq('bilinmeyen köşeli parantez korunur',
  cleanSubtitle('1\n00:00:01,000 --> 00:00:02,000\nSkor [2-1] oldu.\n'),
  'Skor [2-1] oldu.');

// ── Etiket, varlık ve boşluk normalleştirme ─────────────────────────────────

eq('html etiketi ve varlık çözülür',
  cleanSubtitle('WEBVTT\n\n00:00:01.000 --> 00:00:02.000 align:start\n<i>Bu</i> &amp; şu , tamam .\n'),
  'Bu & şu, tamam.');

eq('boş girdi boş döner', cleanSubtitle('   \n\n'), '');
eq('sadece işaretten oluşan girdi boş döner',
  cleanSubtitle('1\n00:00:01,000 --> 00:00:02,000\n[müzik]\n'), '');

// Düz metin (altyazı değil) bozulmadan geçer.
eq('düz metin korunur', cleanSubtitle('Tek satır düz metin.'), 'Tek satır düz metin.');

// ── looksLikeSubtitle ───────────────────────────────────────────────────────

check('srt tanınır', looksLikeSubtitle(KAYAN));
check('vtt tanınır', looksLikeSubtitle('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nselam\n'));
check('düz metin altyazı sayılmaz', !looksLikeSubtitle('Bugün 3 gol attı. Yarın da atar.'));

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
