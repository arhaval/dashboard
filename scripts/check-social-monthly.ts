/**
 * Aylık sosyal medya girişi — deterministik doğrulama.
 *
 *   pnpm exec tsx scripts/check-social-monthly.ts
 *
 * Veritabanına dokunmaz; yalnızca saf katmanı (doluluk + özet) sınar.
 */

import {
  expectedFields,
  isFilled,
  monthCompleteness,
  monthLabel,
  previousMonth,
  MONTHLY_PLATFORMS,
  type MonthlyPlatform,
} from '../src/app/(dashboard)/social/social-monthly.constants';
import { buildMonthlySummary, type GenreStat } from '../src/app/(dashboard)/social/social-summary.constants';

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

// ── 1. Alan doluluğu ────────────────────────────────────────────────────────

eq('dolu: pozitif sayı', isFilled(1200), true);
eq('dolu: gerçek 0 BOŞ sayılır (girilmedi demek)', isFilled(0), false);
eq('dolu: null boş', isFilled(null), false);
eq('dolu: boş metin boş', isFilled(''), false);
eq('dolu: sayı olmayan boş', isFilled('abc'), false);

// ── 2. Beklenen alanlar ─────────────────────────────────────────────────────

{
  const yt = expectedFields('YOUTUBE').map((f) => f.name);
  check('YouTube abone alanı subscribers_total', yt.includes('subscribers_total'), yt);
  check(
    'YouTube followers_total İSTEMEZ (orada kasten 0 kalır)',
    !yt.includes('followers_total'),
    yt
  );

  const web = expectedFields('WEBSITE').map((f) => f.name);
  check('Web sitesinin takipçisi yok', !web.includes('followers_total'), web);
  eq('Web sitesi alanları', web, ['visitors', 'page_views', 'avg_session_seconds']);

  const ig = expectedFields('INSTAGRAM').map((f) => f.name);
  eq('Instagram takipçiyle başlar', ig[0], 'followers_total');

  const kick = expectedFields('KICK').map((f) => f.name);
  eq('Kick takipçiyi iki kez saymaz', kick.filter((n) => n === 'followers_total').length, 1);

  const tiktok = expectedFields('TIKTOK');
  check('TikTok alanları elle girilir', tiktok.every((f) => f.source === 'MANUAL'), tiktok.map((f) => f.source));
  const igFields = expectedFields('INSTAGRAM');
  check('Instagram alanları API kaynaklı', igFields.every((f) => f.source === 'API'), igFields.map((f) => f.source));
}

// ── 3. Ay doluluğu ──────────────────────────────────────────────────────────

{
  const rows = [
    { platform: 'INSTAGRAM', followers_total: 10482, views: 1544155, likes: 66273, comments: 3752, saves: 2864, shares: 13855 },
    // YouTube: abone 0 yazılmış — "veri yok"un sessiz hali, eksik sayılmalı.
    { platform: 'YOUTUBE', followers_total: 0, subscribers_total: 0, video_views: 15843, total_likes: 900, total_comments: 40, avg_live_viewers: 0, peak_live_viewers: 0 },
  ];
  const c = monthCompleteness('2026-07', rows, ['INSTAGRAM', 'YOUTUBE', 'TIKTOK']);

  const ig = c.platforms.find((p) => p.platform === 'INSTAGRAM')!;
  eq('Instagram tam dolu', [ig.filled, ig.total], [6, 6]);
  eq('Instagram eksiksiz', ig.pendingManualFields, []);

  const yt = c.platforms.find((p) => p.platform === 'YOUTUBE')!;
  check('YouTube abone 0 → eksik yakalanır', yt.brokenApiFields.includes('Toplam Abone'), yt.brokenApiFields);
  check('YouTube canlı izleyici elle bekleniyor', yt.pendingManualFields.length === 2, yt.pendingManualFields);

  const tiktok = c.platforms.find((p) => p.platform === 'TIKTOK')!;
  eq('TikTok satırı hiç yok', tiktok.missing, true);
  eq('TikTok hiçbir alanı dolu değil', tiktok.filled, 0);

  check('ay tamamlanmamış', !c.isComplete, c);
  eq('eksik platform listesi', c.incompletePlatforms, ['YOUTUBE', 'TIKTOK']);
  check('yüzde 0-100 arası', c.percent > 0 && c.percent < 100, c.percent);

  // Hepsi dolunca kendiliğinden tamamlanır (hatırlatma da böyle susar).
  const full = monthCompleteness('2026-07', rows, ['INSTAGRAM']);
  eq('tek platform tam → ay tamam', full.isComplete, true);
  eq('tam ayda yüzde 100', full.percent, 100);
}

// ── 4. Ay yardımcıları ──────────────────────────────────────────────────────

eq('ay adı', monthLabel('2026-07'), 'Temmuz 2026');
eq('önceki ay', previousMonth('2026-01'), '2025-12');
eq('önceki ay (aynı yıl)', previousMonth('2026-08'), '2026-07');

// ── 5. Aylık özet ───────────────────────────────────────────────────────────

const GENRES: GenreStat[] = [
  { label: 'Oyuncu/Takım Hikayesi', count: 13, avgViews: 44643 },
  { label: 'Maç Yayını', count: 178, avgViews: 16372 },
  { label: 'Klip', count: 75, avgViews: 14310 },
];

function summaryOf(over: Partial<Parameters<typeof buildMonthlySummary>[0]> = {}) {
  const tracked: MonthlyPlatform[] = over.tracked ?? ['INSTAGRAM', 'YOUTUBE'];
  const rows = over.rows ?? [{ platform: 'INSTAGRAM', followers_total: 10482, views: 1544155 }];
  return buildMonthlySummary({
    month: '2026-07',
    rows,
    previousRows: over.previousRows ?? [{ platform: 'INSTAGRAM', followers_total: 9538, views: 2365698 }],
    contentCount: over.contentCount ?? 7,
    previousContentCount: over.previousContentCount ?? 5,
    genres: over.genres ?? GENRES,
    completeness: over.completeness ?? monthCompleteness('2026-07', rows, tracked),
    tracked,
  });
}

{
  const s = summaryOf();

  check('özet: içerik sayısını söyler', s.did[0].includes('7 içerik'), s.did);
  check('özet: önceki aya göre farkı söyler', s.did[0].includes('2 fazla'), s.did[0]);

  check('özet: toplam erişimi ve yönünü söyler', s.went[0].includes('düşüş'), s.went);
  check('özet: takipçi kazancını söyler', s.went.some((l) => l.includes('+944')), s.went);

  check('özet: düşen platformu adlandırır', s.rising.some((l) => l.includes('Düşen') && l.includes('Instagram')), s.rising);
  check(
    'özet: en çok tutan tür ile en çok üretilen türü kıyaslar',
    s.rising.some((l) => l.includes('Oyuncu/Takım Hikayesi') && l.includes('Maç Yayını')),
    s.rising
  );

  // Türkçe küçük harf: 'İ' → 'i' olmalı, 'i̇' (birleşik nokta) değil.
  const sentences = s.platforms.map((p) => p.sentence).join(' ');
  check('özet: Türkçe küçük harf bozulmuyor', !sentences.includes('i̇'), sentences);

  // Aynı girdi → aynı çıktı.
  eq('özet: deterministik', summaryOf(), s);
}

{
  // Önceki ay yoksa yüzde hesaplanmaz — sıfıra bölme yok, uydurma yok.
  const s = summaryOf({ previousRows: [] });
  check('özet: kıyas verisi yoksa söyler', s.went[0].includes('karşılaştırılabilecek veri yok'), s.went);
  eq('özet: kıyassız platform hareketi NO_DATA', s.platforms[0].reach.movement, 'NO_DATA');
}

{
  // Yükseliş yakalanmalı.
  const rows = [{ platform: 'INSTAGRAM', followers_total: 12000, views: 3000000 }];
  const s = summaryOf({ rows, completeness: monthCompleteness('2026-07', rows, ['INSTAGRAM', 'YOUTUBE']) });
  check('özet: yükselen platform yakalanır', s.rising.some((l) => l.startsWith('Yükselen')), s.rising);
  eq('özet: hareket RISING', s.platforms[0].reach.movement, 'RISING');
}

{
  // %5 altındaki değişim "yatay" — gürültüyü yükseliş diye sunmuyoruz.
  const rows = [{ platform: 'INSTAGRAM', followers_total: 9538, views: 2400000 }];
  const s = summaryOf({ rows, completeness: monthCompleteness('2026-07', rows, ['INSTAGRAM']), tracked: ['INSTAGRAM'] });
  eq('özet: küçük değişim yatay sayılır', s.platforms[0].reach.movement, 'FLAT');
  check('özet: yatayken belirgin hareket yok denir', s.rising.some((l) => l.includes('benzer seviyede')), s.rising);
}

{
  // Uyarılar doluluk haritasından gelir.
  const rows = [{ platform: 'INSTAGRAM', followers_total: 10482, views: 1544155 }];
  const completeness = monthCompleteness('2026-07', rows, ['INSTAGRAM', 'TIKTOK']);
  const s = summaryOf({ rows, completeness, tracked: ['INSTAGRAM', 'TIKTOK'] });
  check('özet: hiç kayıt olmayan platformu uyarır', s.warnings.some((w) => w.includes('TikTok') && w.includes('hiç kayıt')), s.warnings);
  check('özet: eksik alanı uyarır', s.warnings.some((w) => w.includes('Instagram')), s.warnings);
}

// Takip edilen platform listesi tam olmalı ki hiçbiri sessizce atlanmasın.
eq('takip edilen platform sayısı', MONTHLY_PLATFORMS.length, 7);

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
