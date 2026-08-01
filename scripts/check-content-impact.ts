/**
 * İçerik Bazlı Performans — deterministik doğrulama (§16).
 *
 * Projede bir test runner kurulu değil (package.json'da test script'i yok), o
 * yüzden yeni bir bağımlılık eklemek yerine mevcut `tsx` ile çalışan çıplak bir
 * kontrol scripti: saf katmanın (adapter + toplama + kıyas + öneri motoru)
 * sözleşmesini doğrular.
 *
 *   npm run check:content-impact
 *
 * Veritabanına dokunmaz — yalnızca saf fonksiyonları çağırır.
 *
 * Bölümler:
 *   1–3   Toplama (eksik veri, ham etkileşim, etkileşim oranı)
 *   4     Platform metrik adapter (exposure ≠ views, isim eşlemeleri)
 *   5–6   Platform değerlendirme (en güçlü/zayıf, genel durum, skor fallback)
 *   7     Filtre / sıralama / sayfalama
 *   8     Öneri motoru (kurallar, tekilleştirme, 3 aksiyon sınırı)
 */

import {
  buildFacets,
  buildTotals,
  compareImpacts,
  comparePlatforms,
  contentCode,
  deriveOverallStatus,
  engagementRate,
  matchesQuery,
  normalizeQuery,
  resolveScore,
  sumEngagements,
  sumMetric,
  verdictHeadline,
  DEFAULT_IMPACT_QUERY,
  EMPTY_METRICS,
  MAX_ACTIONS,
  MAX_PAGE_SIZE,
  MIN_SAMPLE_FOR_FALLBACK,
  type ContentImpact,
  type ContentImpactQuery,
  type PlatformBenchmark,
  type PlatformMetrics,
  type PlatformPublication,
} from '../src/app/(dashboard)/icerik-performansi/content-impact.constants';
import {
  mapInstagramMetrics,
  mapManualMetrics,
  mapYoutubeMetrics,
  toNumber,
} from '../src/app/(dashboard)/icerik-performansi/content-impact.adapter';
import { contentPerformanceRecommendationService } from '../src/services/content-recommendation.service';
import {
  fromLocalDateTimeInput,
  toLocalDateTimeInput,
  type ContentPlatform,
} from '../src/app/(dashboard)/icerik-plani/content-queue.constants';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(detail === undefined ? name : `${name} — beklenmeyen: ${JSON.stringify(detail)}`);
}

function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? undefined : { actual, expected });
}

// ── Fixture yardımcıları ─────────────────────────────────────────────────────

function pub(
  platform: ContentPlatform,
  metrics: Partial<PlatformMetrics>,
  opts: { score?: number | null; label?: PlatformPublication['label'] } = {}
): PlatformPublication {
  const score = opts.score ?? null;
  return {
    platform,
    publicationId: `pub-${platform.toLowerCase()}`,
    availability: {},
    checkpoints: [],
    snapshotCount: 0,
    title: `${platform} yayını`,
    url: null,
    externalId: null,
    publishedAt: '2026-07-20',
    source: platform === 'YOUTUBE' || platform === 'INSTAGRAM' ? 'API' : 'MANUAL',
    metrics: { ...EMPTY_METRICS, ...metrics },
    exposureBasis: 'izlenme',
    score,
    scoreBasis: score == null ? 'NONE' : 'PLATFORM_SCORE',
    label: opts.label ?? (score == null ? 'COLLECTING' : score >= 1.5 ? 'HIT' : score >= 1.2 ? 'GOOD' : score >= 0.8 ? 'AVERAGE' : 'FLOP'),
    genreLabel: null,
  };
}

function benchmark(platform: ContentPlatform, over: Partial<PlatformBenchmark> = {}): PlatformBenchmark {
  return { platform, avgExposure: null, avgEngagementRate: null, sampleSize: 0, ...over };
}

function impactFixture(
  publications: PlatformPublication[],
  over: Partial<Omit<ContentImpact, 'recommendation'>> = {}
): Omit<ContentImpact, 'recommendation'> {
  return {
    cardId: '49dc4725-5b9a-4d85-8d06-06c7191a160c',
    code: '49DC4725',
    title: 'Test içeriği',
    contentType: 'Short / Reels',
    inLibrary: false,
    firstPublishedAt: '2026-07-20',
    plannedPlatforms: [],
    publications,
    totals: buildTotals(publications),
    comparison: comparePlatforms(publications),
    verdict: deriveOverallStatus(publications),
    thumbnail: null,
    ...over,
  };
}

/** Filtre/sıralama testleri için tam ContentImpact (öneri motoru dahil). */
function fullImpact(over: Partial<ContentImpact>): ContentImpact {
  const base = impactFixture(over.publications ?? [pub('YOUTUBE', { exposure: 1000, views: 1000 }, { score: 1 })], over);
  return { ...base, recommendation: contentPerformanceRecommendationService.evaluate(base), ...over } as ContentImpact;
}

// ═══ 1. Eksik veri sıfır değildir ════════════════════════════════════════════

{
  const pubs = [
    pub('YOUTUBE', { exposure: 1000, views: 1000, likes: 100, comments: 10 }),
    pub('TIKTOK', {}), // hiç sayı girilmemiş
  ];

  eq('sumMetric: yalnızca mevcut değerler toplanır', sumMetric(pubs, 'likes'), {
    value: 100,
    available: 1,
    total: 2,
  });

  eq('sumMetric: hiç veri yoksa value null (0 değil)', sumMetric(pubs, 'saves'), {
    value: null,
    available: 0,
    total: 2,
  });

  const zeroPubs = [pub('TIKTOK', { likes: 0 })];
  eq('sumMetric: gerçek 0 korunur', sumMetric(zeroPubs, 'likes'), { value: 0, available: 1, total: 1 });
}

// ═══ 2. Çoklu platform toplamları ════════════════════════════════════════════

{
  // Üç platform: YouTube (API), Instagram (API), X (gösterim + manuel sayılar)
  const pubs = [
    pub('YOUTUBE', { exposure: 100_000, views: 100_000, likes: 4000, comments: 300 }),
    pub('INSTAGRAM', { exposure: 40_000, views: 40_000, likes: 2500, comments: 120, shares: 400, saves: 900 }),
    pub('X', { exposure: 24_800, views: null, likes: 300, comments: 60, shares: 90, saves: 45, followersGained: 12 }),
  ];
  const totals = buildTotals(pubs);

  eq('toplam erişim: üç platform toplanır', totals.exposure.value, 164_800);
  eq('toplam erişim: veri kapsamı 3/3', [totals.exposure.available, totals.exposure.total], [3, 3]);

  // KRİTİK: X'in gösterimi toplam izlenmeye GİRMEZ.
  eq('toplam izlenme: X gösterimi dahil edilmez', totals.views.value, 140_000);
  eq('toplam izlenme: veri kapsamı 2/3', [totals.views.available, totals.views.total], [2, 3]);
  check('gösterim ve izlenme birbirinden ayrı', totals.exposure.value !== totals.views.value);

  eq('toplam beğeni', totals.likes.value, 6800);
  eq('toplam yorum (X replies dahil)', totals.comments.value, 480);
  eq('toplam paylaşım (X repost dahil)', totals.shares.value, 490);
  eq('toplam kaydetme (X bookmark dahil)', totals.saves.value, 945);
  eq('toplam takipçi kazanımı', totals.followersGained.value, 12);
  eq('takipçi kazanımı kapsamı 1/3', [totals.followersGained.available, totals.followersGained.total], [1, 3]);

  eq('ham etkileşim toplamı', totals.engagements.value, 6800 + 480 + 490 + 945);

  // Tek platformlu içerik
  const single = buildTotals([pub('INSTAGRAM', { exposure: 5000, views: 5000, likes: 200, comments: 10 })]);
  eq('tek platform: erişim = o platformun erişimi', single.exposure.value, 5000);
  eq('tek platform: kapsam 1/1', [single.exposure.available, single.exposure.total], [1, 1]);
  eq('tek platform: olmayan metrik null', single.shares.value, null);

  // Hiç yayın olmayan içerik
  const none = buildTotals([]);
  eq('yayın yok: erişim null', none.exposure.value, null);
  eq('yayın yok: kapsam 0/0', [none.exposure.available, none.exposure.total], [0, 0]);
  eq('yayın yok: ham etkileşim null', none.engagements.value, null);
  eq('yayın yok: durum VERI_YETERSIZ', deriveOverallStatus([]).status, 'VERI_YETERSIZ');
  eq('yayın yok: karşılaştırma boş', comparePlatforms([]), { strongest: null, weakest: null, comparable: 0 });
}

// ═══ 3. Etkileşim oranı ══════════════════════════════════════════════════════

{
  eq('engagementRate: etkileşim / erişim', engagementRate(pub('TIKTOK', { exposure: 1000, likes: 80, comments: 20 })), 0.1);
  eq('engagementRate: erişim yoksa null', engagementRate(pub('TIKTOK', { likes: 80 })), null);
  eq('engagementRate: erişim 0 ise null', engagementRate(pub('TIKTOK', { exposure: 0, likes: 5 })), null);

  const pubs = [
    pub('YOUTUBE', { likes: 100, comments: 10 }),                       // shares/saves yok
    pub('TIKTOK', { likes: 50, comments: 5, shares: 20, saves: 30 }),
  ];
  eq('sumEngagements: likes+comments+shares+saves', sumEngagements(pubs), {
    value: 100 + 10 + 50 + 5 + 20 + 30,
    available: 2,
    total: 2,
  });
  const totals = buildTotals(pubs);
  eq('buildTotals: paylaşım kapsamı 1/2', [totals.shares.value, totals.shares.available, totals.shares.total], [20, 1, 2]);
}

// ═══ 4. PLATFORM METRİK ADAPTER ══════════════════════════════════════════════

{
  eq('toNumber: bigint string çevrilir', toNumber('123456'), 123456);
  eq('toNumber: null null kalır', toNumber(null), null);
  eq('toNumber: boş string null', toNumber(''), null);
  eq('toNumber: gerçek 0 korunur', toNumber(0), 0);
  eq('toNumber: sayı olmayan null', toNumber('abc'), null);

  // X — gösterim erişime girer, izlenmeye ASLA girmez
  const x = mapManualMetrics('X', {
    impressions: 24_800,
    likes: 300,
    comments: 60,
    shares: 90,
    saves: 45,
    followers_gained: 12,
  });
  eq('adapter/X: erişim gösterimden gelir', x.exposure, 24_800);
  eq('adapter/X: izlenme null kalır (gösterim izlenme değildir)', x.views, null);
  eq('adapter/X: replies → comments', x.comments, 60);
  eq('adapter/X: repost → shares', x.shares, 90);
  eq('adapter/X: bookmark → saves', x.saves, 45);
  eq('adapter/X: takipçi kazanımı', x.followersGained, 12);

  // X'te hem gösterim hem izlenme girilirse gösterim erişimi belirler
  const xBoth = mapManualMetrics('X', { impressions: 50_000, views: 1200 });
  eq('adapter/X: erişim gösterim, izlenme ayrı', [xBoth.exposure, xBoth.views], [50_000, 1200]);

  // TikTok — izlenme hem erişim hem izlenmedir
  const tt = mapManualMetrics('TIKTOK', { views: 40_000, likes: 900, saves: 800 });
  eq('adapter/TikTok: erişim = izlenme', [tt.exposure, tt.views], [40_000, 40_000]);
  eq('adapter/TikTok: girilmeyen metrik null', tt.shares, null);

  // Twitch — hiç sayı girilmemişse hepsi null
  eq('adapter: boş satır sıfırlanmaz', mapManualMetrics('TWITCH', {}), { ...EMPTY_METRICS });

  // YouTube — abone/paylaşım/kaydetme entegrasyonda yok → null
  const yt = mapYoutubeMetrics({ view_count: 100_000, like_count: 4000, comment_count: 300 });
  eq('adapter/YouTube: erişim = izlenme', [yt.exposure, yt.views], [100_000, 100_000]);
  eq('adapter/YouTube: beğeni/yorum', [yt.likes, yt.comments], [4000, 300]);
  eq('adapter/YouTube: desteklenmeyen metrikler null', [yt.shares, yt.saves, yt.followersGained], [null, null, null]);

  // Instagram — view_count 0 "insight yok" demektir, gerçek sıfır değil
  const ig = mapInstagramMetrics({ view_count: 40_000, like_count: 2500, comment_count: 120 });
  eq('adapter/Instagram: erişim = izlenme', [ig.exposure, ig.views], [40_000, 40_000]);
  const igNoInsight = mapInstagramMetrics({ view_count: 0, like_count: 300, comment_count: 12 });
  eq('adapter/Instagram: view_count 0 → null (sahte sıfır değil)', [igNoInsight.exposure, igNoInsight.views], [null, null]);
  eq('adapter/Instagram: beğenide 0 gerçek sıfırdır', mapInstagramMetrics({ view_count: 0, like_count: 0, comment_count: 0 }).likes, 0);
}

// ═══ 5. Platform değerlendirme ═══════════════════════════════════════════════

{
  const pubs = [
    pub('YOUTUBE', { exposure: 100_000, views: 100_000 }, { score: 0.9 }),
    pub('INSTAGRAM', { exposure: 15_000, views: 15_000 }, { score: 2.1 }),
  ];
  const cmp = comparePlatforms(pubs);
  eq('en güçlü: 100.000 izlenme tek başına kazanmaz', cmp.strongest?.platform, 'INSTAGRAM');
  eq('en zayıf: YouTube', cmp.weakest?.platform, 'YOUTUBE');
  check('en güçlü açıklaması oranı içerir', cmp.strongest?.explanation.includes('2,10 katı') === true, cmp.strongest?.explanation);

  const single = comparePlatforms([pub('INSTAGRAM', { exposure: 1000 }, { score: 1.6 })]);
  eq('tek platformda en zayıf yok', single.weakest, null);
  eq('skoru olmayan platform yarışmaz', comparePlatforms([pub('TIKTOK', { exposure: 9 })]).comparable, 0);

  // Skoru olan/olmayan karışık: yalnızca skorlular yarışır
  const mixed = comparePlatforms([
    pub('YOUTUBE', { exposure: 5000 }, { score: 1.1 }),
    pub('TIKTOK', { exposure: 900_000 }),
  ]);
  eq('skorsuz platform en güçlü olamaz', mixed.strongest?.platform, 'YOUTUBE');
  eq('skorsuz platform karşılaştırmaya girmez', mixed.comparable, 1);
}

// ═══ 5b. Genel durum ═════════════════════════════════════════════════════════

{
  eq('durum: skor yoksa VERI_YETERSIZ', deriveOverallStatus([pub('TIKTOK', {})]).status, 'VERI_YETERSIZ');

  const single = deriveOverallStatus([pub('INSTAGRAM', {}, { score: 1.6 })]);
  eq('durum: tek güçlü platform → GUCLU', single.status, 'GUCLU');
  eq('durum: tek platform notu', single.note, 'yalnızca Instagram verisine dayanıyor');

  eq(
    'durum: iki platform HIT → COK_GUCLU',
    deriveOverallStatus([pub('YOUTUBE', {}, { score: 1.8 }), pub('INSTAGRAM', {}, { score: 2.4 })]).status,
    'COK_GUCLU'
  );

  eq(
    'durum: çoğunluk zayıf → ZAYIF',
    deriveOverallStatus([pub('YOUTUBE', {}, { score: 0.4 }), pub('INSTAGRAM', {}, { score: 0.5 }), pub('TIKTOK', {}, { score: 1.0 })]).status,
    'ZAYIF'
  );

  eq(
    'durum: dengeli → ORTA',
    deriveOverallStatus([pub('YOUTUBE', {}, { score: 1.0 }), pub('INSTAGRAM', {}, { score: 0.9 })]).status,
    'ORTA'
  );

  const partial = deriveOverallStatus([pub('YOUTUBE', {}, { score: 1.0 }), pub('TIKTOK', {})]);
  eq('durum: tek skorlu platform + yayın sayısı', partial.note, "yalnızca YouTube verisine dayanıyor (2 platformdan 1'i)");
  eq('durum: skorlu platform sayısı', partial.scoredPlatforms, 1);

  const both = deriveOverallStatus([pub('YOUTUBE', {}, { score: 1.0 }), pub('TIKTOK', {}, { score: 1.3 })]);
  eq('durum: iki skorlu platform notu', both.note, '2/2 platformun skoruna dayanıyor');
}

// ═══ 6. Skor fallback sırası ═════════════════════════════════════════════════

{
  const metrics: PlatformMetrics = { ...EMPTY_METRICS, exposure: 20_000, likes: 1000 };

  eq(
    'resolveScore: mevcut platform skoru öncelikli',
    resolveScore(metrics, 1.75, benchmark('TIKTOK', { avgExposure: 1, sampleSize: 99 }), 0.5),
    { score: 1.75, basis: 'PLATFORM_SCORE', label: 'HIT' }
  );

  eq(
    'resolveScore: fallback 1 — platform içi erişim oranı',
    resolveScore(metrics, null, benchmark('TIKTOK', { avgExposure: 10_000, sampleSize: MIN_SAMPLE_FOR_FALLBACK }), 0.5),
    { score: 2, basis: 'PLATFORM_RATIO', label: 'HIT' }
  );

  eq(
    'resolveScore: fallback 2 — etkileşim oranı',
    resolveScore(metrics, null, benchmark('TIKTOK', { avgEngagementRate: 0.05, sampleSize: MIN_SAMPLE_FOR_FALLBACK }), 0.1),
    { score: 2, basis: 'ENGAGEMENT_RATE', label: 'HIT' }
  );

  eq(
    'resolveScore: örnek yetersizse fallback kullanılmaz',
    resolveScore(metrics, null, benchmark('TIKTOK', { avgExposure: 10_000, sampleSize: MIN_SAMPLE_FOR_FALLBACK - 1 }), 0.5),
    { score: null, basis: 'NONE', label: 'COLLECTING' }
  );

  eq(
    'resolveScore: ölçüt yoksa veri yetersiz',
    resolveScore(metrics, null, undefined, null),
    { score: null, basis: 'NONE', label: 'COLLECTING' }
  );

  eq('contentCode: uuid → 8 haneli kod', contentCode('49dc4725-5b9a-4d85-8d06-06c7191a160c'), '49DC4725');
}

// ═══ 6b. Yayın anı dönüşümü — saat kaymamalı ════════════════════════════════
// Ölçüm noktaları (24 saat / 7 gün / 30 gün) yayın ANINA göre hesaplanıyor.
// Tarayıcı yerel saat verir, veritabanı UTC saklar; gidiş-dönüş girilen saati
// aynen korumalı, yoksa "24 saat" ölçümü yanlış anı ölçer.

{
  const local = '2026-08-01T21:00';
  const stored = fromLocalDateTimeInput(local);
  check('yayın anı: yerel giriş ISO ana çevrilir', typeof stored === 'string' && stored.endsWith('Z'), stored);
  eq('yayın anı: gidiş-dönüş saati korur', toLocalDateTimeInput(stored), local);
  eq('yayın anı: girilen saat gerçekten 21:00', stored ? new Date(stored).getHours() : null, 21);

  eq('yayın anı: boş giriş null', fromLocalDateTimeInput('   '), null);
  eq('yayın anı: geçersiz giriş null', fromLocalDateTimeInput('bugün'), null);
  eq('yayın anı: null değer boş girdi', toLocalDateTimeInput(null), '');

  // Saatsiz eski kayıtlar da okunabilmeli (gece yarısına düşerler).
  eq(
    'yayın anı: saatsiz kayıt gece yarısı olur',
    toLocalDateTimeInput(new Date(2026, 7, 1, 0, 0).toISOString()),
    '2026-08-01T00:00'
  );
}

// ═══ 7. Filtre / sıralama / sayfalama ════════════════════════════════════════

{
  const corpus: ContentImpact[] = [
    fullImpact({
      cardId: 'a0000000-0000-0000-0000-000000000001', code: 'AAAA0001',
      title: 'Şampiyonluk Röportajı', contentType: 'Video', inLibrary: true,
      firstPublishedAt: '2026-07-01',
      publications: [pub('YOUTUBE', { exposure: 90_000, views: 90_000, likes: 500 }, { score: 1.9 })],
    }),
    fullImpact({
      cardId: 'b0000000-0000-0000-0000-000000000002', code: 'BBBB0002',
      title: 'Maç Sonu Klip', contentType: 'Short / Reels', inLibrary: false,
      firstPublishedAt: '2026-07-15',
      publications: [
        pub('INSTAGRAM', { exposure: 30_000, views: 30_000, likes: 1200 }, { score: 1.3 }),
        pub('TIKTOK', { exposure: 20_000, views: 20_000, likes: 400 }, { score: 0.6 }),
      ],
    }),
    fullImpact({
      cardId: 'c0000000-0000-0000-0000-000000000003', code: 'CCCC0003',
      title: 'Transfer Duyurusu', contentType: 'Gönderi / Post', inLibrary: false,
      firstPublishedAt: '2026-07-25',
      publications: [pub('X', { exposure: 12_000, likes: 200, comments: 40 }, { score: 0.5 })],
    }),
  ];

  const q = (over: Partial<ContentImpactQuery> = {}): ContentImpactQuery =>
    normalizeQuery({ ...DEFAULT_IMPACT_QUERY, ...over });

  const ids = (query: ContentImpactQuery) => corpus.filter((i) => matchesQuery(i, query)).map((i) => i.code);

  eq('filtre: varsayılan hepsini geçirir', ids(q()).length, 3);
  eq('filtre: arama (Türkçe duyarsız)', ids(q({ search: 'şampiyonluk' })), ['AAAA0001']);
  eq('filtre: arama küçük/büyük harf duyarsız', ids(q({ search: 'MAÇ' })), ['BBBB0002']);
  eq('filtre: içerik koduyla arama', ids(q({ search: 'CCCC0003' })), ['CCCC0003']);
  eq('filtre: tarih aralığı', ids(q({ from: '2026-07-10', to: '2026-07-20' })), ['BBBB0002']);
  eq('filtre: yalnızca başlangıç tarihi', ids(q({ from: '2026-07-20' })), ['CCCC0003']);
  eq('filtre: içerik türü', ids(q({ contentType: 'Video' })), ['AAAA0001']);
  eq('filtre: platform', ids(q({ platforms: ['TIKTOK'] })), ['BBBB0002']);
  eq('filtre: birden fazla platform AND ile çalışır', ids(q({ platforms: ['INSTAGRAM', 'TIKTOK'] })), ['BBBB0002']);
  eq('filtre: eşleşmeyen platform kombinasyonu boş döner', ids(q({ platforms: ['YOUTUBE', 'TIKTOK'] })), []);
  eq('filtre: tek platformlu', ids(q({ reach: 'SINGLE' })), ['AAAA0001', 'CCCC0003']);
  eq('filtre: çok platformlu', ids(q({ reach: 'MULTI' })), ['BBBB0002']);
  eq('filtre: kütüphanede olanlar', ids(q({ library: 'IN_LIBRARY' })), ['AAAA0001']);
  eq('filtre: kütüphanede olmayanlar', ids(q({ library: 'NOT_IN_LIBRARY' })), ['BBBB0002', 'CCCC0003']);
  eq('filtre: genel durum', ids(q({ status: 'GUCLU' })), ['AAAA0001']);
  eq('filtre: filtreler birlikte uygulanır (AND)', ids(q({ reach: 'SINGLE', contentType: 'Video' })), ['AAAA0001']);

  const sorted = (s: ContentImpactQuery['sort']) => [...corpus].sort((a, b) => compareImpacts(a, b, s)).map((i) => i.code);
  eq('sıralama: en yeni', sorted('NEWEST'), ['CCCC0003', 'BBBB0002', 'AAAA0001']);
  eq('sıralama: en eski', sorted('OLDEST'), ['AAAA0001', 'BBBB0002', 'CCCC0003']);
  eq('sıralama: en yüksek toplam erişim', sorted('EXPOSURE'), ['AAAA0001', 'BBBB0002', 'CCCC0003']);
  eq('sıralama: en yüksek toplam etkileşim', sorted('ENGAGEMENT'), ['BBBB0002', 'AAAA0001', 'CCCC0003']);
  eq('sıralama: en güçlü genel durum', sorted('STATUS')[0], 'AAAA0001');
  eq('sıralama: en fazla platform', sorted('PLATFORMS')[0], 'BBBB0002');

  // Erişim verisi olmayan içerik "0 erişim"in de altına düşmeli
  const noData = fullImpact({
    cardId: 'd0000000-0000-0000-0000-000000000004', code: 'DDDD0004',
    firstPublishedAt: '2026-07-26', publications: [pub('TIKTOK', {})],
  });
  const zero = fullImpact({
    cardId: 'e0000000-0000-0000-0000-000000000005', code: 'EEEE0005',
    firstPublishedAt: '2026-07-27', publications: [pub('TIKTOK', { exposure: 0 })],
  });
  eq(
    'sıralama: erişim verisi olmayan, gerçek 0’ın altında',
    [noData, zero].sort((a, b) => compareImpacts(a, b, 'EXPOSURE')).map((i) => i.code),
    ['EEEE0005', 'DDDD0004']
  );

  // Sıralama deterministik olmalı — sayfalama arası satır kayması olmasın
  const tieA = fullImpact({ cardId: 'f0000000-0000-0000-0000-00000000000a', code: 'AAA', firstPublishedAt: '2026-07-20' });
  const tieB = fullImpact({ cardId: 'f0000000-0000-0000-0000-00000000000b', code: 'BBB', firstPublishedAt: '2026-07-20' });
  eq(
    'sıralama: eşitlikte deterministik',
    [tieB, tieA].sort((a, b) => compareImpacts(a, b, 'NEWEST')).map((i) => i.cardId),
    [tieA.cardId, tieB.cardId]
  );

  // Sorgu normalizasyonu — client sınırsız sayfa boyutu isteyemez
  eq('normalizeQuery: sayfa boyutu sınırlanır', normalizeQuery({ pageSize: 5000 }).pageSize, MAX_PAGE_SIZE);
  eq('normalizeQuery: sayfa en az 1', normalizeQuery({ page: 0 }).page, 1);
  eq('normalizeQuery: tekrar eden platform tekilleşir', normalizeQuery({ platforms: ['X', 'X'] }).platforms, ['X']);
  eq('normalizeQuery: arama kırpılır', normalizeQuery({ search: '  klip  ' }).search, 'klip');

  const facets = buildFacets(corpus);
  eq('facet: platform sayıları', facets.platforms.find((p) => p.platform === 'INSTAGRAM')?.count, 1);
  eq('facet: içerik türü sayıları', facets.contentTypes.length, 3);
  eq('facet: durum sayıları toplamı içerik sayısına eşit', facets.statuses.reduce((s, x) => s + x.count, 0), corpus.length);
}

// ═══ 8. Öneri motoru ═════════════════════════════════════════════════════════

{
  // ── Tek platform (RULE_SINGLE_PLATFORM_ONLY) ──────────────────────────────
  const single = impactFixture(
    [pub('INSTAGRAM', { exposure: 50_000, views: 50_000, likes: 2000, comments: 40 }, { score: 1.7 })],
    { contentType: 'Short / Reels' }
  );
  const r1 = contentPerformanceRecommendationService.evaluate(single);
  check('R03: tek platform kuralı tetiklenir', r1.triggeredRules.includes('R03_SINGLE_PLATFORM'), r1.triggeredRules);
  const cross = r1.actions.find((a) => a.code === 'CROSS_POST');
  eq('R03: güçlü tek platformda çapraz paylaşım HIGH', cross?.priority, 'HIGH');
  check('R03: platform önerisi içerik tipine göre', cross?.label.includes('TikTok') === true, cross?.label);
  check('R03: uygun olmayan platform önerilmez', cross?.label.includes('Twitch') === false, cross?.label);
  check('gözlem satırı üretilir', r1.observation.length > 0);
  eq('aynı girdi → aynı çıktı (deterministik)', contentPerformanceRecommendationService.evaluate(single), r1);

  // Bilinmeyen içerik tipinde platform uydurulmaz
  const unknownType = impactFixture([pub('TWITCH', { exposure: 900, views: 900 }, { score: 1.0 })], { contentType: 'Bilinmeyen' });
  const rUnknown = contentPerformanceRecommendationService.evaluate(unknownType);
  const crossUnknown = rUnknown.actions.find((a) => a.code === 'CROSS_POST');
  eq('R03: bilinmeyen tipte platform ismi verilmez', crossUnknown?.label, 'Aynı içeriği uygun bir platformda daha dağıt');

  // ── Planlanmış ama yayınlanmamış platform ─────────────────────────────────
  const planned = impactFixture(
    [pub('YOUTUBE', { exposure: 1000, views: 1000, likes: 10 }, { score: 1.0 })],
    { plannedPlatforms: ['YOUTUBE', 'X'] }
  );
  const r2 = contentPerformanceRecommendationService.evaluate(planned);
  check('R02: eksik planlanmış platform yakalanır', r2.triggeredRules.includes('R02_MISSING_PLANNED_PLATFORM'), r2.triggeredRules);

  // ── Elle girilecek sayılar boş / API senkronize değil ─────────────────────
  const emptyManual = impactFixture([
    pub('YOUTUBE', { exposure: 1000, views: 1000, likes: 10 }, { score: 1.0 }),
    pub('TIKTOK', {}),
  ]);
  const r3 = contentPerformanceRecommendationService.evaluate(emptyManual);
  check('R04: boş manuel metrik yakalanır', r3.triggeredRules.includes('R04_MISSING_MANUAL_METRICS'), r3.triggeredRules);
  check('R15: eksik veri kapsamı yakalanır', r3.triggeredRules.includes('R15_PARTIAL_DATA_COVERAGE'), r3.triggeredRules);

  const unsynced = impactFixture([
    pub('YOUTUBE', { exposure: 4711, views: 4711, likes: 171, comments: 14 }, { score: 0.41 }),
    pub('INSTAGRAM', {}),
  ]);
  const rSync = contentPerformanceRecommendationService.evaluate(unsynced);
  check('R16: senkronize edilmemiş API platformu yakalanır', rSync.triggeredRules.includes('R16_UNSYNCED_API_PLATFORM'), rSync.triggeredRules);
  check('R16: API platformu için elle giriş önerilmez', !rSync.triggeredRules.includes('R04_MISSING_MANUAL_METRICS'), rSync.triggeredRules);

  // ── R06 platform farkı + R17 belirgin kazanan (RULE_PLATFORM_WINNER) ──────
  const gap = impactFixture([
    pub('YOUTUBE', { exposure: 5000, views: 5000, likes: 50 }, { score: 0.5 }),
    pub('INSTAGRAM', { exposure: 60_000, views: 60_000, likes: 3000 }, { score: 2.0 }),
  ]);
  const r4 = contentPerformanceRecommendationService.evaluate(gap);
  check('R06: platform farkı yakalanır', r4.triggeredRules.includes('R06_PLATFORM_GAP'), r4.triggeredRules);
  check('R17: belirgin kazanan yakalanır', r4.triggeredRules.includes('R17_PLATFORM_WINNER'), r4.triggeredRules);
  check('R17: kazanan paketlemesi önerilir', r4.actions.some((a) => a.code === 'REUSE_WINNER_PACKAGING'), r4.actions.map((a) => a.code));

  // 1.50x altında kazanan sayılmaz
  const noWinner = impactFixture([
    pub('YOUTUBE', { exposure: 5000, views: 5000 }, { score: 0.9 }),
    pub('INSTAGRAM', { exposure: 9000, views: 9000 }, { score: 1.4 }),
  ]);
  check(
    'R17: 1.50x altında kazanan ilan edilmez',
    !contentPerformanceRecommendationService.evaluate(noWinner).triggeredRules.includes('R17_PLATFORM_WINNER')
  );

  // Yüksek ama diğerinden belirgin ayrışmayan skor da kazanan değildir
  const tooClose = impactFixture([
    pub('YOUTUBE', { exposure: 50_000, views: 50_000 }, { score: 1.6 }),
    pub('INSTAGRAM', { exposure: 60_000, views: 60_000 }, { score: 1.5 }),
  ]);
  check(
    'R17: diğerlerinden ayrışmayan skor kazanan sayılmaz',
    !contentPerformanceRecommendationService.evaluate(tooClose).triggeredRules.includes('R17_PLATFORM_WINNER')
  );

  // ── R19 çapraz platform başarısı (RULE_CROSS_PLATFORM_SUCCESS) ────────────
  const crossSuccess = impactFixture([
    pub('YOUTUBE', { exposure: 40_000, views: 40_000, likes: 900 }, { score: 1.2 }),
    pub('INSTAGRAM', { exposure: 30_000, views: 30_000, likes: 1500 }, { score: 1.4 }),
  ]);
  const r19 = contentPerformanceRecommendationService.evaluate(crossSuccess);
  check('R19: iki platform güçlü → çapraz başarı', r19.triggeredRules.includes('R19_CROSS_PLATFORM_SUCCESS'), r19.triggeredRules);
  check('R19: devam içeriği önerilir', r19.actions.some((a) => a.code === 'SEQUEL_SAME_TOPIC'), r19.actions.map((a) => a.code));
  check('R19: format başka konuya uygulanır', r19.actions.some((a) => a.code === 'APPLY_FORMAT_TO_OTHER_SUBJECT'), r19.actions.map((a) => a.code));

  const oneStrong = impactFixture([
    pub('YOUTUBE', { exposure: 40_000, views: 40_000 }, { score: 1.2 }),
    pub('INSTAGRAM', { exposure: 3000, views: 3000 }, { score: 0.9 }),
  ]);
  check(
    'R19: tek güçlü platform çapraz başarı sayılmaz',
    !contentPerformanceRecommendationService.evaluate(oneStrong).triggeredRules.includes('R19_CROSS_PLATFORM_SUCCESS')
  );

  // ── R18 tüm platformlar zayıf (RULE_ALL_PLATFORMS_WEAK) ───────────────────
  const allWeak = impactFixture([
    pub('YOUTUBE', { exposure: 900, views: 900, likes: 10 }, { score: 0.4 }),
    pub('INSTAGRAM', { exposure: 700, views: 700, likes: 12 }, { score: 0.6 }),
  ]);
  const r18 = contentPerformanceRecommendationService.evaluate(allWeak);
  check('R18: platformların çoğu zayıf yakalanır', r18.triggeredRules.includes('R18_ALL_PLATFORMS_WEAK'), r18.triggeredRules);
  check('R18: fikri tekrarlama aksiyonu', r18.actions.some((a) => a.code === 'PAUSE_TOPIC'), r18.actions.map((a) => a.code));
  check('R18: başarısız örnek incelemeye gönderilir', r18.actions.some((a) => a.code === 'STUDY_AS_FAILURE'), r18.actions.map((a) => a.code));
  check(
    'R18: "durdur" ile "devam içeriği üret" aynı listede olmaz',
    !r18.actions.some((a) => a.group === 'FOLLOW_UP'),
    r18.actions.map((a) => `${a.code}:${a.group}`)
  );
  check(
    'R18: hook değiştirmeden yeniden kullanma uyarısı',
    r18.interpretation.some((t) => t.includes('hook')),
    r18.interpretation
  );

  // 0.85 eşiğinin hemen üstü zayıf sayılmaz
  const borderline = impactFixture([
    pub('YOUTUBE', {}, { score: 0.9 }),
    pub('INSTAGRAM', {}, { score: 0.86 }),
  ]);
  check(
    'R18: 0.85 üstü platformlar zayıf sayılmaz',
    !contentPerformanceRecommendationService.evaluate(borderline).triggeredRules.includes('R18_ALL_PLATFORMS_WEAK')
  );

  // Bir platform açıkça tuttuysa fikir "her yerde başarısız" sayılamaz —
  // aksi halde 1.80x yapan bir X gönderisi varken sistem "tekrarlama" der.
  const mostlyWeakButOneStrong = impactFixture([
    pub('X', {}, { score: 1.8 }),
    pub('YOUTUBE', {}, { score: 0.4 }),
    pub('INSTAGRAM', {}, { score: 0.5 }),
  ]);
  check(
    'R18: bir platform güçlüyken fikir ölü sayılmaz',
    !contentPerformanceRecommendationService.evaluate(mostlyWeakButOneStrong).triggeredRules.includes('R18_ALL_PLATFORMS_WEAK'),
    contentPerformanceRecommendationService.evaluate(mostlyWeakButOneStrong).triggeredRules
  );

  // ── R20 X güçlü, video platformları zayıf (RULE_X_STRONG) ─────────────────
  const xStrong = impactFixture([
    pub('X', { exposure: 80_000, likes: 900, comments: 300, shares: 200 }, { score: 1.8 }),
    pub('YOUTUBE', { exposure: 2000, views: 2000, likes: 20 }, { score: 0.4 }),
    pub('INSTAGRAM', { exposure: 1500, views: 1500, likes: 30 }, { score: 0.5 }),
  ]);
  const r20 = contentPerformanceRecommendationService.evaluate(xStrong);
  check('R20: X güçlü / video zayıf yakalanır', r20.triggeredRules.includes('R20_X_STRONG_VIDEO_WEAK'), r20.triggeredRules);
  // X follow-up aksiyonu R17'nin "aynı fikri kazanan platformda sürdür"
  // aksiyonuyla aynı anlama geldiği için birleşebilir; aranan şey kodun kendisi
  // değil, X'e yönelen bir devam aksiyonunun listede olması.
  check(
    'R20: X’e yönelen devam aksiyonu üretilir',
    r20.actions.some((a) => a.group === 'FOLLOW_UP' && a.label.includes('X (Twitter)')),
    r20.actions.map((a) => `${a.code}:${a.label}`)
  );
  check(
    'R20: video tarafı için paketleme düzeltmesi önerilir',
    r20.actions.some((a) => a.group === 'FIX_WEAK_PLATFORM'),
    r20.actions.map((a) => a.code)
  );

  // Video platformlarından biri iyiyse kural tetiklenmez
  const xStrongVideoOk = impactFixture([
    pub('X', { exposure: 80_000, likes: 900 }, { score: 1.8 }),
    pub('YOUTUBE', { exposure: 40_000, views: 40_000 }, { score: 1.1 }),
  ]);
  check(
    'R20: video platformu ortalamadaysa kural tetiklenmez',
    !contentPerformanceRecommendationService.evaluate(xStrongVideoOk).triggeredRules.includes('R20_X_STRONG_VIDEO_WEAK')
  );

  // ── R21 Instagram paylaşım/kaydetme (RULE_INSTAGRAM_SHARES_SAVES) ─────────
  const igSpread = impactFixture([
    pub('INSTAGRAM', { exposure: 30_000, views: 30_000, likes: 700, comments: 50, shares: 180, saves: 400 }, { score: 1.3 }),
  ]);
  const r21 = contentPerformanceRecommendationService.evaluate(igSpread);
  check('R21: Instagram paylaşım/kaydetme gücü yakalanır', r21.triggeredRules.includes('R21_IG_SHARE_SAVE_STRONG'), r21.triggeredRules);
  check('R21: carousel önerilir', r21.actions.some((a) => a.code === 'IG_CAROUSEL'), r21.actions.map((a) => a.code));

  // Veri gelmemişse kural tetiklenmez (API paylaşım/kaydetme vermiyor)
  const igNoSpreadData = impactFixture([
    pub('INSTAGRAM', { exposure: 30_000, views: 30_000, likes: 700, comments: 50 }, { score: 1.3 }),
  ]);
  check(
    'R21: paylaşım/kaydetme verisi yoksa kural tetiklenmez',
    !contentPerformanceRecommendationService.evaluate(igNoSpreadData).triggeredRules.includes('R21_IG_SHARE_SAVE_STRONG')
  );

  // ── R09 / R10 erişim ↔ etkileşim dengesi ──────────────────────────────────
  const lowEng = impactFixture([
    pub('TIKTOK', { exposure: 100_000, views: 100_000, likes: 100, comments: 2 }, { score: 1.0 }),
    pub('YOUTUBE', { exposure: 9000, views: 9000, likes: 300, comments: 30 }, { score: 1.0 }),
  ]);
  const r9 = contentPerformanceRecommendationService.evaluate(lowEng, {
    TIKTOK: benchmark('TIKTOK', { avgEngagementRate: 0.03, sampleSize: 10 }),
  });
  check('R09: yüksek erişim / düşük etkileşim yakalanır', r9.triggeredRules.includes('R09_HIGH_EXPOSURE_LOW_ENGAGEMENT'), r9.triggeredRules);
  check(
    'R09: devamı otomatik güçlü sayılmaz uyarısı',
    r9.interpretation.some((t) => t.includes('otomatik')),
    r9.interpretation
  );

  const highEngLowReach = impactFixture([
    pub('TIKTOK', { exposure: 2000, views: 2000, likes: 400, comments: 60 }, { score: 0.5 }),
    pub('YOUTUBE', { exposure: 9000, views: 9000, likes: 90 }, { score: 1.0 }),
  ]);
  const r10 = contentPerformanceRecommendationService.evaluate(highEngLowReach, {
    TIKTOK: benchmark('TIKTOK', { avgEngagementRate: 0.05, sampleSize: 10 }),
  });
  check('R10: düşük erişim / yüksek etkileşim yakalanır', r10.triggeredRules.includes('R10_HIGH_ENGAGEMENT_LOW_EXPOSURE'), r10.triggeredRules);
  check('R10: yeniden dağıtım önerilir', r10.actions.some((a) => a.code === 'BOOST_DISTRIBUTION'), r10.actions.map((a) => a.code));
  check(
    'R10: düşük görüntülenme tek başına başarısızlık sayılmaz',
    r10.interpretation.some((t) => t.includes('niş')),
    r10.interpretation
  );

  // ── Takipçi kazanımı + kaydetme ağırlığı ──────────────────────────────────
  const growth = impactFixture([
    pub('TIKTOK', { exposure: 40_000, views: 40_000, likes: 900, comments: 20, shares: 300, saves: 800, followersGained: 120 }, { score: 1.3 }),
    pub('YOUTUBE', { exposure: 9000, views: 9000, likes: 200, comments: 30 }, { score: 1.0 }),
  ]);
  const r5 = contentPerformanceRecommendationService.evaluate(growth);
  check('R13: takipçi kazanımı yakalanır', r5.triggeredRules.includes('R13_FOLLOWER_GROWTH'), r5.triggeredRules);
  check('R11: kaydetme ağırlığı yakalanır', r5.triggeredRules.includes('R11_SAVE_HEAVY'), r5.triggeredRules);

  // ── Veri yetersiz ─────────────────────────────────────────────────────────
  const noData = impactFixture([pub('TIKTOK', {}), pub('X', {})]);
  const r7 = contentPerformanceRecommendationService.evaluate(noData);
  check('R05: karşılaştırılabilir skor yok', r7.triggeredRules.includes('R05_NO_COMPARABLE_SCORE'), r7.triggeredRules);
  check('yorum bölümü boş kalmaz', r7.interpretation.length > 0);

  // ── Hiç yayın yok ─────────────────────────────────────────────────────────
  const noPub = contentPerformanceRecommendationService.evaluate(impactFixture([]));
  eq('R01: yayın kaydı yok', noPub.triggeredRules, ['R01_NO_PUBLICATION']);
  eq('R01: tek aksiyon', noPub.actions.map((a) => a.code), ['RECORD_PUBLICATION']);

  // ── Semantik: görünürlük ile izlenme alt küme DEĞİL ───────────────────────
  const semantics = impactFixture([
    pub('YOUTUBE', { exposure: 40_451, views: 50_115, likes: 2098, comments: 59 }, { score: 1.21 }),
  ]);
  const rSem = contentPerformanceRecommendationService.evaluate(semantics);
  check(
    'semantik: görünürlük "platform görünürlüğü" olarak adlandırılır',
    rSem.observation.some((o) => o.includes('Toplam platform görünürlüğü 40.451')),
    rSem.observation
  );
  check(
    'semantik: izlenme alt küme gibi sunulmaz ("bunun X kadarı" YOK)',
    !rSem.observation.some((o) => o.includes('Bunun')),
    rSem.observation
  );
  check(
    'semantik: tekrar izleme uyarısı verilir',
    rSem.observation.some((o) => o.includes('tekrar izlemeler nedeniyle')),
    rSem.observation
  );

  // ── Genel durum: platform farkı varsa tek kelime yetmez ───────────────────
  const varied = [
    pub('YOUTUBE', { exposure: 50_115 }, { score: 1.21 }),
    pub('INSTAGRAM', { exposure: 26_311 }, { score: 0.84 }),
  ];
  const vh = verdictHeadline(varied, deriveOverallStatus(varied));
  eq('durum: fark belirginse ana mesaj farkı anlatır', vh.title, 'Platforma göre değişiyor');
  eq('durum: platform farkı işaretlenir', vh.variesByPlatform, true);
  check('durum: alt metin her platformu skoruyla anlatır',
    vh.detail.includes('YouTube başarılı (1,21x)') && vh.detail.includes('Instagram ortalamanın altında (0,84x)'),
    vh.detail);

  const uniform = [
    pub('YOUTUBE', {}, { score: 1.05 }),
    pub('INSTAGRAM', {}, { score: 1.0 }),
  ];
  const vhUniform = verdictHeadline(uniform, deriveOverallStatus(uniform));
  eq('durum: platformlar yakınsa genel etiket kalır', vhUniform.variesByPlatform, false);
  check('durum: yakın sonuçta da skorlar gösterilir', vhUniform.detail.includes('1,05x'), vhUniform.detail);
  eq(
    'durum: tek platformda fark iddiası yok',
    verdictHeadline([pub('YOUTUBE', {}, { score: 2.0 })], deriveOverallStatus([pub('YOUTUBE', {}, { score: 2.0 })])).variesByPlatform,
    false
  );

  // ── Takipçi dönüşümü: ham sayı tek başına HIGH üretmemeli ─────────────────
  const weakConversion = impactFixture([
    pub('YOUTUBE', { exposure: 50_115, views: 50_115, likes: 2098, followersGained: 4 }, { score: 1.21 }),
  ]);
  const rWeak = contentPerformanceRecommendationService.evaluate(weakConversion);
  const weakAction = rWeak.actions.find((a) => a.code === 'WATCH_CONVERSION' || a.code === 'FUNNEL_WORKS');
  eq('dönüşüm: 4 abone / 50 bin izlenme HIGH üretmez', weakAction?.code, 'WATCH_CONVERSION');
  eq('dönüşüm: düşük hacim düşük öncelik', weakAction?.priority, 'LOW');
  check(
    'dönüşüm: sinyal saklanmaz, izlemeye devam denir',
    rWeak.interpretation.some((t) => t.includes('izlemeye devam et')),
    rWeak.interpretation
  );

  const strongConversion = impactFixture([
    pub('YOUTUBE', { exposure: 60_000, views: 60_000, likes: 3000, followersGained: 120 }, { score: 1.3 }),
  ]);
  const rStrong = contentPerformanceRecommendationService.evaluate(strongConversion);
  const strongAction = rStrong.actions.find((a) => a.code === 'FUNNEL_WORKS');
  eq('dönüşüm: yeterli hacim+oran HIGH üretir', strongAction?.priority, 'HIGH');
  check('dönüşüm: gerekçe oranı içerir', strongAction?.reason.includes('bin izlenme başına') === true, strongAction?.reason);

  // Hacim yeterli ama oran zayıf → yine kanıt sayılmaz
  const lowRate = impactFixture([
    pub('YOUTUBE', { exposure: 900_000, views: 900_000, likes: 5000, followersGained: 30 }, { score: 1.1 }),
  ]);
  eq(
    'dönüşüm: oran düşükse hacim tek başına yetmez',
    contentPerformanceRecommendationService.evaluate(lowRate).actions.find((a) => a.group === 'REAPPLY_FORMAT')?.code,
    'WATCH_CONVERSION'
  );

  // ── Instagram paylaşım+kaydetme: kanıt gerekçede görünür ──────────────────
  const igEvidence = impactFixture([
    pub('INSTAGRAM', { exposure: 26_311, views: 35_969, likes: 1299, comments: 29, shares: 206, saves: 147 }, { score: 0.84 }),
  ]);
  const rIg = contentPerformanceRecommendationService.evaluate(igEvidence);
  const carousel = rIg.actions.find((a) => a.code === 'IG_CAROUSEL');
  check(
    'IG: gerekçe ham sayıları gösterir',
    carousel?.reason.includes('206 paylaşım + 147 kaydetme') === true,
    carousel?.reason
  );
  check('IG: gerekçe toplamı ve payı verir', carousel?.reason.includes('353') === true, carousel?.reason);

  // ── Sözleşme: sıra, tekilleştirme, 3 aksiyon sınırı ───────────────────────
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  const busy = impactFixture(
    [
      pub('INSTAGRAM', { exposure: 60_000, views: 60_000, likes: 2000, comments: 400, shares: 500, saves: 1500, followersGained: 90 }, { score: 2.2 }),
      pub('YOUTUBE', { exposure: 3000, views: 3000, likes: 40, comments: 5 }, { score: 0.5 }),
      pub('TIKTOK', {}),
    ],
    { plannedPlatforms: ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'X'], contentType: 'Short / Reels' }
  );
  const rBusy = contentPerformanceRecommendationService.evaluate(busy, {
    YOUTUBE: benchmark('YOUTUBE', { avgEngagementRate: 0.05, sampleSize: 50 }),
  });
  check('çok kural tetiklenir (sınır testi anlamlı olsun)', rBusy.triggeredRules.length >= 6, rBusy.triggeredRules);
  check(`en fazla ${MAX_ACTIONS} aksiyon döner`, rBusy.actions.length <= MAX_ACTIONS, rBusy.actions.map((a) => a.code));
  eq(
    'aynı anlam grubundan tek aksiyon kalır',
    rBusy.actions.map((a) => a.group).length,
    new Set(rBusy.actions.map((a) => a.group)).size
  );
  eq(
    'aynı aksiyon kodu iki kez dönmez',
    rBusy.actions.map((a) => a.code).length,
    new Set(rBusy.actions.map((a) => a.code)).size
  );
  check(
    'aksiyonlar önceliğe göre sıralı',
    rBusy.actions.every((a, i) => i === 0 || order[rBusy.actions[i - 1].priority] <= order[a.priority]),
    rBusy.actions.map((a) => a.priority)
  );
  check(
    'her aksiyonun gerekçesi var',
    rBusy.actions.every((a) => a.reason.trim().length > 0),
    rBusy.actions.map((a) => a.reason)
  );
  eq(
    'aksiyonlar en fazla 3 (MAX_ACTIONS)',
    MAX_ACTIONS,
    3
  );
  check(
    'aksiyonlar farklı karar slotlarından geliyor (hepsi aynı iş değil)',
    new Set(rBusy.actions.map((a) => a.group)).size === rBusy.actions.length,
    rBusy.actions.map((a) => a.group)
  );
  check(
    'her tetiklenen kural R ile kodlanmış',
    rBusy.triggeredRules.every((r) => /^R\d{2}_/.test(r)),
    rBusy.triggeredRules
  );
}

// ── Sonuç ────────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
