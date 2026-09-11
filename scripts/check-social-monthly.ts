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
  readMetric,
  toInputValue,
  toStoredValue,
  ANALYTICS_METRICS,
  DERIVED_ENGAGEMENT,
  DERIVED_VIEWS,
  MONTHLY_PLATFORMS,
  type MonthlyPlatform,
} from '../src/app/(dashboard)/social/social-monthly.constants';
import {
  buildInsights,
  buildKpis,
  buildPlatformRows,
  topGenreForMonth,
} from '../src/app/(dashboard)/social/social-overview.constants';
import {
  REPORT_DUE_DAY,
  SETTLE_DAYS,
  monthProgress,
  reportDueDate,
  monthsToRefresh,
  resolveMonth,
  selectableMonths,
} from '../src/app/(dashboard)/social/month.utils';
import { bucketContentTypeRows, lastNDaysRange } from '../src/services/youtube-analytics.service';

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
  // Sitenin takipçisi yok; karşılığı üye sayısı. Genel followers_total
  // sorulmamalı, yoksa hiç dolmayacak bir alan ayı sonsuza dek eksik tutardı.
  check('Web sitesinde genel takipçi alanı sorulmaz', !web.includes('followers_total'), web);
  eq('Web sitesi alanları', web, ['members_total', 'visitors', 'page_views', 'avg_session_seconds']);
  eq('Web sitesi üye sayısı grafiklenebilir', ANALYTICS_METRICS.WEBSITE[0].key, 'members_total');

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

// ── 6. Genel Bakış: KPI, platform tablosu, içgörüler ────────────────────────

{
  const july = [
    { platform: 'INSTAGRAM', followers_total: 10482, views: 1544155, likes: 66273, comments: 3752, saves: 2864, shares: 13855 },
    { platform: 'YOUTUBE', subscribers_total: 29800, video_views: 15843, total_likes: 900, total_comments: 40, live_views: 5000 },
  ];
  const june = [
    { platform: 'INSTAGRAM', followers_total: 9538, views: 2365698, likes: 147356, comments: 3116, saves: 7758, shares: 21695 },
    { platform: 'YOUTUBE', subscribers_total: 29535, video_views: 23000, total_likes: 1200, total_comments: 60, live_views: 8000 },
  ];
  const tracked: MonthlyPlatform[] = ['INSTAGRAM', 'YOUTUBE', 'TIKTOK'];
  const kpis = buildKpis(july, june, tracked);
  const byKey = Object.fromEntries(kpis.map((k) => [k.key, k]));

  // YouTube takipçisi subscribers_total'da — toplama girmezse KPI hep eksik çıkardı.
  eq('KPI: takipçi YouTube abonesini içerir', byKey.followers.value, 10482 + 29800);
  eq('KPI: takipçi artışı', byKey.followers.delta, (10482 + 29800) - (9538 + 29535));

  // TikTok verisi yok → toplam olduğundan düşük, işaretlenmeli.
  eq('KPI: eksik veri işaretlenir', byKey.views.hasGaps, true);
  eq('KPI: raporlayan/beklenen', [byKey.views.reporting, byKey.views.expected], [2, 3]);

  // Twitch/Kick etkileşim raporlamaz → beklenen platform sayısına girmez;
  // aksi halde "eksik veri" uyarısı hiç dolmayacak bir alan için kalırdı.
  const withStream = buildKpis(july, june, ['INSTAGRAM', 'YOUTUBE', 'TWITCH', 'KICK']);
  eq(
    'KPI: etkileşim raporlamayan platform beklenmez',
    withStream.find((k) => k.key === 'engagement')!.expected,
    2
  );
  // TikTok etkileşim raporlar — beklenenlere girer.
  eq('KPI: TikTok etkileşime dahil', byKey.engagement.expected, 3);

  // Canlı izlenmeyi yalnızca YouTube veriyor (IG/TikTok raporlamaz).
  eq('KPI: canlı izlenme yalnız ilgili platformlardan', byKey.liveViews.value, 5000);

  // Web sitesi üyeleri "Toplam Takipçi"ye girer — sahip olunan kitle aynı
  // kartta toplanır. Site takibe alınmamışsa KPI'ı etkilemez.
  const withSite = buildKpis(
    [...july, { platform: 'WEBSITE', members_total: 1200, visitors: 8000 }],
    [...june, { platform: 'WEBSITE', members_total: 1000, visitors: 7000 }],
    ['INSTAGRAM', 'YOUTUBE', 'WEBSITE']
  );
  const siteFollowers = withSite.find((k) => k.key === 'followers')!;
  eq('KPI: site üyeleri takipçi toplamına girer', siteFollowers.value, 10482 + 29800 + 1200);
  eq('KPI: site üye artışı sayılır', siteFollowers.delta, (10482 + 29800 + 1200) - (9538 + 29535 + 1000));

  // Kapsam iki ay arasında tutmuyorsa yüzde ÜRETİLMEZ.
  const lopsided = buildKpis(july, [june[0]], tracked);
  const lopsidedViews = lopsided.find((k) => k.key === 'views')!;
  eq('KPI: kapsam tutmuyorsa yüzde üretilmez', lopsidedViews.percent, null);
  eq('KPI: kapsam tutmuyorsa fark üretilmez', lopsidedViews.delta, null);
  check('KPI: değer yine de gösterilir', lopsidedViews.value != null, lopsidedViews.value);

  // ── Platform tablosu ──
  const rows = buildPlatformRows(july, june, tracked);
  const ig = rows.find((r) => r.platform === 'INSTAGRAM')!;
  eq('tablo: Instagram düşüşte', ig.status, 'DOWN');
  eq('tablo: takipçi değişimi', ig.followersDelta, 944);
  eq('tablo: etkileşim toplamı', ig.engagement, 66273 + 3752 + 2864 + 13855);

  const tiktok = rows.find((r) => r.platform === 'TIKTOK')!;
  eq('tablo: verisi olmayan platform MISSING', tiktok.status, 'MISSING');
  eq('tablo: veri yoksa sıfır değil null', [tiktok.followers, tiktok.views, tiktok.engagement], [null, null, null]);

  const yt = rows.find((r) => r.platform === 'YOUTUBE')!;
  eq('tablo: YouTube takipçisi abone alanından', yt.followers, 29800);

  // ── İçgörüler ──
  const insights = buildInsights({
    platforms: rows,
    topGenre: { label: 'Oyuncu/Takım Hikayesi', avgViews: 44643 },
    missingPlatforms: ['TikTok'],
  });
  check('içgörü: en fazla 4 satır', insights.length <= 4, insights.length);
  check('içgörü: en güçlü tür yer alır', insights.some((i) => i.subject.includes('Hikayesi')), insights);
  check('içgörü: eksik veri uyarısı', insights.some((i) => i.title === 'Dikkat'), insights);
  eq('içgörü: deterministik', buildInsights({ platforms: rows, topGenre: { label: 'Oyuncu/Takım Hikayesi', avgViews: 44643 }, missingPlatforms: ['TikTok'] }), insights);
}

// ── 6b. Analiz: grafiklenebilir metrikler ───────────────────────────────────

{
  for (const p of MONTHLY_PLATFORMS) {
    check(`analiz: ${p} için metrik tanımlı`, ANALYTICS_METRICS[p].length > 0, ANALYTICS_METRICS[p]);
  }

  const igRow = { platform: 'INSTAGRAM', followers_total: 10482, views: 1544155, likes: 66273, comments: 3752, saves: 0 };
  eq('analiz: düz kolon okunur', readMetric(igRow, 'INSTAGRAM', 'views'), 1544155);
  eq('analiz: 0 girilmemiş sayılır', readMetric(igRow, 'INSTAGRAM', 'saves'), null);
  eq('analiz: olmayan kolon null', readMetric(igRow, 'INSTAGRAM', 'shares'), null);
  eq('analiz: satır yoksa null', readMetric(undefined, 'INSTAGRAM', 'views'), null);

  // X'te "Etkileşim" tek kolon değil, toplam.
  const xRow = { platform: 'X', likes: 9900, replies: 120, shares: 152 };
  eq('analiz: türetilmiş etkileşim toplanır', readMetric(xRow, 'X', DERIVED_ENGAGEMENT), 9900 + 120 + 152);
  eq('analiz: etkileşim verisi yoksa null', readMetric({ platform: 'X' }, 'X', DERIVED_ENGAGEMENT), null);

  // Twitch etkileşim raporlamaz — türetilmiş metrik uydurulmamalı.
  eq('analiz: raporlamayan platformda etkileşim null', readMetric({ platform: 'TWITCH', live_views: 500 }, 'TWITCH', DERIVED_ENGAGEMENT), null);

  // YouTube grafiğinde abone alanı doğru kolondan gelmeli.
  eq('analiz: YouTube abonesi', readMetric({ platform: 'YOUTUBE', subscribers_total: 29800 }, 'YOUTUBE', 'subscribers_total'), 29800);
}

// ── 7. Ay seçimi ────────────────────────────────────────────────────────────

{
  const available = ['2026-05', '2026-06', '2026-07', '2026-08'];
  const now = new Date(2026, 7, 15); // 15 Ağustos 2026

  eq('ay: varsayılan kapanmış son ay', resolveMonth(undefined, available, now), '2026-07');
  eq('ay: geçerli istek korunur', resolveMonth('2026-05', available, now), '2026-05');
  eq('ay: bozuk istek yok sayılır', resolveMonth('abc', available, now), '2026-07');
  eq('ay: hiç veri yoksa içinde bulunulan ay', resolveMonth(undefined, [], now), '2026-08');
  eq('ay: yalnızca içinde bulunulan ay varsa o', resolveMonth(undefined, ['2026-08'], now), '2026-08');

  // Seçim listesi KESİNTİSİZ olmalı: hiç veri girilmemiş bir ay listede
  // görünmezse o aya gidip "tamamlandı" işaretlemek imkânsız olurdu.
  eq(
    'ay listesi: aradaki boş aylar da seçilebilir',
    selectableMonths(['2026-05', '2026-08'], now),
    ['2026-05', '2026-06', '2026-07', '2026-08']
  );
  eq('ay listesi: içinde bulunulan aya kadar gider', selectableMonths(['2026-06'], now).at(-1), '2026-08');
  eq('ay listesi: yıl sınırını geçer', selectableMonths(['2025-11'], new Date(2026, 0, 5)), ['2025-11', '2025-12', '2026-01']);
  eq('ay listesi: hiç veri yoksa bu ay', selectableMonths([], now), ['2026-08']);
}

// ── 7b. Birim çevrimi: yayın süresi saat girilir, dakika saklanır ───────────

{
  const kick = expectedFields('KICK');
  const streamTime = kick.find((f) => f.name === 'total_stream_time_minutes')!;
  check('Kick: yayın süresi saat biriminde', streamTime.unit === 'HOURS_STORED_AS_MINUTES', streamTime);
  check('Kick: etiket saat diyor', streamTime.label.includes('saat'), streamTime.label);
  check('Kick: benzersiz izleyici soruluyor', kick.some((f) => f.name === 'unique_viewers'), kick.map((f) => f.name));

  eq('çevrim: 42 saat → 2520 dakika', toStoredValue(streamTime, 42), 2520);
  eq('çevrim: 2520 dakika → 42 saat', toInputValue(streamTime, 2520), 42);
  eq('çevrim: buçuklu saat', toStoredValue(streamTime, 10.5), 630);

  // Birimsiz alanlar dokunulmadan geçmeli.
  const followers = kick.find((f) => f.name === 'followers_total')!;
  eq('çevrim: sayı alanı değişmez', toStoredValue(followers, 1659), 1659);
  eq('çevrim: sayı alanı geri de değişmez', toInputValue(followers, 1659), 1659);

  // Analizde de saat okunmalı — grafik ve tablo aynı readMetric'ten geçer.
  eq(
    'analiz: yayın süresi saat olarak okunur',
    readMetric({ platform: 'KICK', total_stream_time_minutes: 2520 }, 'KICK', 'total_stream_time_minutes'),
    42
  );
  eq(
    'analiz: Twitch yayın süresi de saat',
    readMetric({ platform: 'TWITCH', total_stream_time_minutes: 600 }, 'TWITCH', 'total_stream_time_minutes'),
    10
  );

  // Kick'te girilen her alan artık grafiklenebilir olmalı — girip göremediğin
  // alan kullanıcıya "verim kayboldu" hissi veriyordu.
  const graphable = new Set(ANALYTICS_METRICS.KICK.map((m) => m.key));
  const ungraphable = kick.map((f) => f.name).filter((n) => !graphable.has(n));
  eq('Kick: girilen her alan grafiklenebilir', ungraphable, []);

  const twitch = expectedFields('TWITCH').map((f) => f.name);
  const twitchGraphable = new Set(ANALYTICS_METRICS.TWITCH.map((m) => m.key));
  eq('Twitch: girilen her alan grafiklenebilir', twitch.filter((n) => !twitchGraphable.has(n)), []);
}

// ── 8. Ayı elle tamamlandı işaretleme ───────────────────────────────────────

{
  const rows = [{ platform: 'INSTAGRAM', followers_total: 10482, views: 1544155 }];
  const tracked: MonthlyPlatform[] = ['INSTAGRAM', 'TIKTOK'];

  const open = monthCompleteness('2026-06', rows, tracked);
  check('kapatılmamış ay tamamlanmamış', !open.isComplete, open.isComplete);
  eq('kapatılmamış ay elle kapalı değil', open.isManuallyClosed, false);

  const closed = monthCompleteness('2026-06', rows, tracked, true);
  eq('kapatılan ay tamamlanmış sayılır (hatırlatma susar)', closed.isComplete, true);
  eq('kapatılan ay elle kapalı işaretlenir', closed.isManuallyClosed, true);

  // Kapatmak veriyi doldurmuş SAYMAZ: yüzde gerçeği söylemeye devam eder.
  eq('kapatmak yüzdeyi şişirmez', closed.percent, open.percent);
  eq('kapatmak eksik listesini gizlemez', closed.incompletePlatforms, open.incompletePlatforms);
  eq('kapatmak alan sayımını değiştirmez', [closed.filled, closed.total], [open.filled, open.total]);
}

// ── 8. Yarım ay: ay içinde biriken metrikler kıyaslanmaz ───────────────────
// Gerçek vaka (11 Eylül 2026): 11 günlük Instagram görüntülenmesi tam
// Ağustos'la kıyaslanınca "en büyük düşüş %83" çıkıyordu; canlı izlenme
// ayın 11'inde Ağustos'un %72'sine ulaşmışken "%28 düşüş" deniyordu.

{
  const sep = new Date(2026, 8, 11);
  eq('ilerleme: içinde bulunulan ay', monthProgress('2026-09', sep), { inProgress: true, day: 11, days: 30 });
  eq('ilerleme: biten ay', monthProgress('2026-08', sep), { inProgress: false, day: 31, days: 31 });
  eq('ilerleme: şubat 2026', monthProgress('2026-02', sep).days, 28);
  eq('ilerleme: gelecek ay', monthProgress('2026-10', sep), { inProgress: true, day: 0, days: 31 });

  const aug = [
    { platform: 'INSTAGRAM', followers_total: 10557, views: 1303210, likes: 44863, comments: 2088, saves: 1787, shares: 5288 },
    { platform: 'YOUTUBE', subscribers_total: 30500, video_views: 4656, total_likes: 9369, total_comments: 96, live_views: 203645 },
  ];
  const sepRows = [
    { platform: 'INSTAGRAM', followers_total: 10510, views: 224978, likes: 7256, comments: 227, saves: 206, shares: 849 },
    { platform: 'YOUTUBE', subscribers_total: 30800, video_views: 2416, total_likes: 2935, total_comments: 17, live_views: 146597 },
  ];
  const tracked: MonthlyPlatform[] = ['INSTAGRAM', 'YOUTUBE'];

  // Hatanın kendisi: seçenek verilmezse eski (yanıltıcı) yüzde üretilir.
  eq('regresyon: seçeneksiz canlı izlenme yüzdesi', buildKpis(sepRows, aug, tracked).find((x) => x.key === 'liveViews')!.percent, -28);

  const k = Object.fromEntries(buildKpis(sepRows, aug, tracked, { inProgress: true }).map((x) => [x.key, x]));
  // Takipçi anlık durumdur — ay ortasında da kıyaslanır.
  eq('yarım ay: takipçi farkı korunur', k.followers.delta, (10510 + 30800) - (10557 + 30500));
  eq('yarım ay: takipçi STOCK', k.followers.kind, 'STOCK');
  check('yarım ay: takipçi işaretlenmez', !k.followers.partialMonth);
  for (const key of ['views', 'engagement', 'liveViews'] as const) {
    eq(`yarım ay: ${key} farkı üretilmez`, [k[key].delta, k[key].percent], [null, null]);
    check(`yarım ay: ${key} işaretlenir`, k[key].partialMonth);
    check(`yarım ay: ${key} değeri yine gösterilir`, k[key].value != null);
  }

  const rows = buildPlatformRows(sepRows, aug, tracked, { inProgress: true });
  const ig = rows.find((r) => r.platform === 'INSTAGRAM')!;
  eq('yarım ay: görüntülenme yüzdesi üretilmez', ig.viewsPercent, null);
  eq('yarım ay: takipçi farkı tabloda kalır', ig.followersDelta, -47);
  // Durum görüntülenmeden değil takipçiden türer: gerçek bir 47 kayıp.
  eq('yarım ay: Instagram durumu takipçiden', ig.status, 'DOWN');
  eq('yarım ay: YouTube abone artışı', rows.find((r) => r.platform === 'YOUTUBE')!.status, 'UP');

  const insights = buildInsights({ platforms: rows, topGenre: null, missingPlatforms: [] });
  check('yarım ay: "en büyük düşüş" uydurulmaz', !insights.some((i) => i.title === 'En büyük düşüş'), insights);
  check('yarım ay: "en hızlı büyüyen" uydurulmaz', !insights.some((i) => i.title === 'En hızlı büyüyen'), insights);

  // Biten ayda davranış değişmez.
  eq('biten ay: canlı izlenme yüzdesi üretilir', buildKpis(sepRows, aug, tracked, { inProgress: false }).find((x) => x.key === 'liveViews')!.percent, -28);
}

// ── 9. En güçlü tür yalnızca o ayın videolarından ──────────────────────────

{
  const v = (publishedAt: string | null, views: number, genreLabel: string) => ({ publishedAt, views, genreLabel });
  const videos = [
    v('2026-08-03T10:00:00+00:00', 40000, 'Oyuncu/Takım Hikayesi'),
    v('2026-08-20T10:00:00+00:00', 60000, 'Oyuncu/Takım Hikayesi'),
    v('2026-08-10T10:00:00+00:00', 20000, 'Taktik'),
    v('2026-07-10T10:00:00+00:00', 900000, 'Taktik'),
    v(null, 500000, 'Haber'),
    v('2026-08-11T10:00:00+00:00', 0, 'Haber'),
  ];
  eq('tür: yalnız o ayın izlenmiş videoları', topGenreForMonth(videos, '2026-08'), { label: 'Oyuncu/Takım Hikayesi', avgViews: 50000 });
  eq('tür: tek tür varsa sıralanmaz', topGenreForMonth(videos, '2026-07'), null);
  eq('tür: video yoksa null', topGenreForMonth(videos, '2026-09'), null);
}

// ── 10. Senkron penceresi: kapanan ay gecikmeli veriyle yenilenir ──────────
// Gerçek vaka: Ağustos 2026 satırı 31 Ağustos 06:03'te dondu ve son günleri
// hiç gelmedi; cron yalnızca içinde bulunulan ayı dolduruyordu.

{
  eq('senkron: ayın 1i önceki ay da', monthsToRefresh(new Date(2026, 8, 1)), ['2026-08', '2026-09']);
  eq('senkron: pencerenin son günü', monthsToRefresh(new Date(2026, 8, SETTLE_DAYS)), ['2026-08', '2026-09']);
  eq('senkron: pencere sonrası yalnız bu ay', monthsToRefresh(new Date(2026, 8, SETTLE_DAYS + 1)), ['2026-09']);
  eq('senkron: yıl dönümü', monthsToRefresh(new Date(2027, 0, 2)), ['2026-12', '2027-01']);
}

// ── 11. YouTube içerik türü kovaları ve Studio penceresi ───────────────────

{
  const rows: [string, number, number, number][] = [
    ['videoOnDemand', 2416, 100, 5],
    ['shorts', 31062, 900, 10],
    ['liveStream', 146597, 1935, 2],
    ['posts', 500, 50, 1],
    ['UNSPECIFIED', 12000, 0, 0],
  ];
  const t = bucketContentTypeRows(rows);
  eq('kova: video', t.video_views, 2416);
  eq('kova: shorts', t.shorts_views, 31062);
  eq('kova: canlı', t.live_views, 146597);
  // Eskiden sessizce atılan görüntülenmeler artık görünür.
  eq('kova: dışarıda kalan görüntülenme sayılır', t.other_views, 12500);
  eq('kova: hiçbir görüntülenme kaybolmaz', t.video_views + t.shorts_views + t.live_views + t.other_views, 192575);
  // Aylık tablonun mevcut tanımı korunur: beğeni/yorum yalnızca üç kovadan.
  eq('kova: beğeni üç kovadan', t.total_likes, 2935);
  eq('kova: yorum üç kovadan', t.total_comments, 17);
  eq('kova: boş yanıt', bucketContentTypeRows([]), {
    video_views: 0, shorts_views: 0, live_views: 0, total_likes: 0, total_comments: 0, other_views: 0,
  });

  // Studio "son 28 gün": dün biter, 28 günü tam kapsar.
  eq('pencere: son 28 gün', lastNDaysRange(28, new Date(2026, 8, 11)), { start: '2026-08-14', end: '2026-09-10' });
  eq('pencere: ay başında önceki aya taşar', lastNDaysRange(1, new Date(2026, 8, 1)), { start: '2026-08-31', end: '2026-08-31' });
}

// ── 12. Rapor günü: ayın raporu bir sonraki ayın 10'unda ─────────────────
// Gerçek vaka: 11 Eylül'de girilen Ağustos raporu, Eylül açık kaldığı için
// Eylül'e kaydedildi. Süren aya elle giriş artık hem arayüzde hem sunucuda
// engelli; raporun hangi gün girileceği tek yerden okunur.

{
  const aug = reportDueDate('2026-08');
  eq('rapor: Ağustos raporu 10 Eylül', [aug.getFullYear(), aug.getMonth() + 1, aug.getDate()], [2026, 9, REPORT_DUE_DAY]);
  const dec = reportDueDate('2026-12');
  eq('rapor: Aralık raporu 10 Ocak (yıl dönümü)', [dec.getFullYear(), dec.getMonth() + 1, dec.getDate()], [2027, 1, 10]);

  // Rapor günü geldiğinde raporlanacak ay kapanmış olmalı, girilen ay süren ay değil.
  const dueDay = new Date(2026, 8, REPORT_DUE_DAY);
  check('rapor günü: raporlanan ay kapanmış', !monthProgress('2026-08', dueDay).inProgress);
  check('rapor günü: içinde bulunulan ay girişe kapalı', monthProgress('2026-09', dueDay).inProgress);
}

// ── 13. YouTube erişimi: video + Shorts + canlı ───────────────────────────
// Panel yalnızca uzun videoyu sayıyordu: Ağustos 2026'da "5,4K görüntülenme,
// %63 düşüş" yazıyordu; gerçek 460.339 ve Temmuz'a göre %70 ARTIŞ.

{
  const jul = [{ platform: 'YOUTUBE', subscribers_total: 29800, video_views: 14910, shorts_views: 148601, live_views: 107470 }];
  const aug = [{ platform: 'YOUTUBE', subscribers_total: 30500, video_views: 5447, shorts_views: 165724, live_views: 289168 }];
  const tracked: MonthlyPlatform[] = ['YOUTUBE'];

  const row = buildPlatformRows(aug, jul, tracked)[0];
  eq('YouTube: erişim üç kolonun toplamı', row.views, 5447 + 165724 + 289168);
  eq('YouTube: yön artış', row.viewsPercent, 70);
  eq('YouTube: durum yükseliş', row.status, 'UP');

  const views = buildKpis(aug, jul, tracked).find((k) => k.key === 'views')!;
  eq('YouTube: KPI toplamı aynı', views.value, 460339);

  // Eksik kolon 0 sayılmaz; girilen kadarıyla toplam üretilir.
  eq('YouTube: yalnız uzun video girilmişse', buildPlatformRows([{ platform: 'YOUTUBE', video_views: 100 }], [], tracked)[0].views, 100);
  // Hiç görüntülenme kolonu yoksa 0 değil null.
  eq('YouTube: hiç veri yoksa null', buildPlatformRows([{ platform: 'YOUTUBE', subscribers_total: 30500 }], [], tracked)[0].views, null);

  // Diğer platformlarda tek kolon davranışı değişmedi.
  const ig = buildPlatformRows(
    [{ platform: 'INSTAGRAM', views: 1303210 }],
    [{ platform: 'INSTAGRAM', views: 1544155 }],
    ['INSTAGRAM']
  )[0];
  eq('Instagram: tek kolon korunur', ig.views, 1303210);
  eq('Instagram: yüzde korunur', ig.viewsPercent, -16);
}

// ── 13b. Analiz: birleşik görüntülenme aynı sayıyı verir ──────────────────
// Genel Bakış'ta okunan sayı grafikte de çizilebilmeli, yoksa iki ekran farklı
// şey anlatır.

{
  const yt = { platform: 'YOUTUBE', video_views: 5447, shorts_views: 165724, live_views: 289168 };
  eq('analiz: YouTube toplam görüntülenme', readMetric(yt, 'YOUTUBE', DERIVED_VIEWS), 460339);
  eq('analiz: toplam görüntülenme verisi yoksa null', readMetric({ platform: 'YOUTUBE', subscribers_total: 30500 }, 'YOUTUBE', DERIVED_VIEWS), null);
  // Tek kolonlu platformda birleşik metrik o kolona eşittir.
  eq('analiz: Instagram birleşik = tek kolon', readMetric({ platform: 'INSTAGRAM', views: 1303210 }, 'INSTAGRAM', DERIVED_VIEWS), 1303210);
}

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
