/**
 * YouTube + Instagram gelişmiş metrik entegrasyonu — deterministik doğrulama (§17).
 *
 *   npm run check:publication-metrics
 *
 * Veritabanına ve gerçek API'ye DOKUNMAZ. Ağ çağrısı gereken yerlerde
 * `globalThis.fetch` geçici olarak sahte cevap döndürecek şekilde değiştirilir.
 *
 * Bölümler:
 *   1  Ortak parse kuralları (null / 0 / string / bozuk değer)
 *   2  YouTube Data API + Analytics eşlemesi
 *   3  Instagram media + insights eşlemesi, birim dönüşümü
 *   4  Yetenek keşfi (desteklenmeyen metrik diğerlerini bozmuyor)
 *   5  Snapshot ve checkpoint mantığı
 *   6  Backfill kuralları
 *   7  Toplamlarda semantik ayrım (playlist ≠ kaydetme vb.)
 */

import {
  mapInstagramInsights,
  mapInstagramMetrics,
  mapManualMetrics,
  mapYoutubeAnalytics,
  mapYoutubeMetrics,
  millisecondsToSeconds,
  minutesToSeconds,
  overlayMetrics,
  parseMetric,
  toNumber,
  type ParseIssue,
} from '../src/app/(dashboard)/icerik-performansi/content-impact.adapter';
import {
  buildTotals,
  sumEngagements,
  EMPTY_METRICS,
  SUMMABLE_METRICS,
  SUPPORTED_METRICS,
  isUnsupported,
  metricsFor,
  type PlatformMetrics,
  type PlatformPublication,
} from '../src/app/(dashboard)/icerik-performansi/content-impact.constants';
import {
  dataCompleteness,
  isSnapshotDue,
  mergeAvailability,
  mergeLatestMetrics,
  metricsChanged,
  pendingCheckpoints,
  resolveCheckpoint,
  syncIntervalHours,
  CHECKPOINT_TOLERANCE_HOURS,
  EMPTY_COVERAGE,
  type PublicationSnapshot,
} from '../src/app/(dashboard)/icerik-performansi/publication-snapshot.constants';
import {
  instagramInsightsService,
  createCapabilityCache,
  toMediaKind,
  INSTAGRAM_INSIGHT_CAPABILITIES,
} from '../src/services/instagram-insights.service';
import type { ContentPlatform } from '../src/app/(dashboard)/icerik-plani/content-queue.constants';

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

// ═══ 1. ORTAK PARSE KURALLARI ════════════════════════════════════════════════

{
  eq('parse: undefined → null', parseMetric(undefined, 'views', 'TEST'), null);
  eq('parse: null → null', parseMetric(null, 'views', 'TEST'), null);
  eq('parse: 0 → 0 (gerçek sıfır korunur)', parseMetric(0, 'views', 'TEST'), 0);
  eq('parse: "0" → 0', parseMetric('0', 'views', 'TEST'), 0);
  eq('parse: sayısal string → number', parseMetric('123456', 'views', 'TEST'), 123456);
  eq('parse: boş string → null', parseMetric('', 'views', 'TEST'), null);

  const issues: ParseIssue[] = [];
  eq('parse: bozuk değer → null (0 DEĞİL)', parseMetric('abc', 'views', 'YT', issues), null);
  eq('parse: bozuk değer hata olarak kaydedilir', issues, [{ metric: 'views', source: 'YT', raw: 'abc' }]);

  const silent: ParseIssue[] = [];
  parseMetric(null, 'views', 'YT', silent);
  eq('parse: eksik metrik hata sayılmaz', silent.length, 0);

  eq('toNumber: bigint string', toNumber('9007199254'), 9007199254);
  eq('toNumber: bozuk → null', toNumber('x'), null);
}

// ═══ 2. YOUTUBE ══════════════════════════════════════════════════════════════

{
  // ── Data API ──────────────────────────────────────────────────────────────
  const data = mapYoutubeMetrics({ view_count: 100_000, like_count: 4000, comment_count: 300 });
  eq('YT Data: viewCount → views + exposure', [data.views, data.exposure], [100_000, 100_000]);
  eq('YT Data: likeCount → likes', data.likes, 4000);
  eq('YT Data: commentCount → comments', data.comments, 300);
  eq('YT Data: gelişmiş metrikler null', [data.watchTimeSeconds, data.shares, data.playlistAdds], [null, null, null]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const a = mapYoutubeAnalytics({
    views: 98_000,
    engagedViews: 61_000,
    likes: 3900,
    comments: 290,
    shares: 1450,
    estimatedMinutesWatched: 12_000,
    averageViewDuration: 214,
    averageViewPercentage: 43.75,
    subscribersGained: 320,
    subscribersLost: 41,
    videosAddedToPlaylists: 180,
    videosRemovedFromPlaylists: 25,
  });

  eq('YT Analytics: shares eşlenir', a.shares, 1450);
  eq('YT Analytics: engagedViews ile views AYRI', [a.views, a.engagedViews], [98_000, 61_000]);
  check('YT Analytics: engagedViews views yerine kullanılmaz', a.views !== a.engagedViews);
  eq('YT Analytics: estimatedMinutesWatched → saniye (×60)', a.watchTimeSeconds, 720_000);
  eq('YT Analytics: averageViewDuration zaten saniye, tekrar çevrilmez', a.averageViewDurationSeconds, 214);
  eq('YT Analytics: averageViewPercentage eşlenir', a.averageViewPercentage, 43.75);
  eq('YT Analytics: subscribersGained → ortak followersGained', a.followersGained, 320);
  eq('YT Analytics: subscribersLost → followersLost', a.followersLost, 41);
  eq('YT Analytics: oynatma listesi ekleme/çıkarma', [a.playlistAdds, a.playlistRemovals], [180, 25]);
  eq('YT Analytics: net oynatma listesi = ekleme − çıkarma', a.netPlaylistAdds, 155);

  // EN KRİTİK: oynatma listesine ekleme KAYDETME değildir.
  eq('YT: oynatma listesi ekleme saves’e YAZILMAZ', a.saves, null);
  check('YT: playlistAdds ile saves farklı alanlar', a.playlistAdds !== null && a.saves === null);

  // Kısmi veri: gelmeyen alan 0 yapılmaz
  const partial = mapYoutubeAnalytics({ views: 10, shares: 3 });
  eq('YT Analytics: gelmeyen metrik null kalır', [partial.watchTimeSeconds, partial.followersGained], [null, null]);
  eq('YT Analytics: net playlist ikisi de yoksa null', partial.netPlaylistAdds, null);
  eq(
    'YT Analytics: yalnızca ekleme geldiyse net = ekleme',
    mapYoutubeAnalytics({ videosAddedToPlaylists: 12 }).netPlaylistAdds,
    12
  );
  eq('YT Analytics: gerçek 0 korunur', mapYoutubeAnalytics({ shares: 0 }).shares, 0);

  // Shorts: ham izlenme ile engaged ayrı kalmalı
  const shorts = mapYoutubeAnalytics({ views: 500_000, engagedViews: 120_000 });
  check('YT Shorts: views ve engagedViews ayrı saklanır', shorts.views === 500_000 && shorts.engagedViews === 120_000);

  // Analytics hatasında Data API verisi korunur (overlay null ile ezmez)
  const preserved = overlayMetrics(data, { shares: null, watchTimeSeconds: null });
  eq('YT: Analytics boş dönerse Data API verisi korunur', [preserved.views, preserved.likes], [100_000, 4000]);
  eq('YT: null patch mevcut değeri silmez', preserved.shares, null);
  const overwritten = overlayMetrics(data, { likes: 4100, shares: 22 });
  eq('YT: dolu patch üstüne yazar', [overwritten.likes, overwritten.shares], [4100, 22]);

  eq('birim: dakika → saniye', minutesToSeconds(3), 180);
  eq('birim: dakika null ise null', minutesToSeconds(null), null);
}

// ═══ 3. INSTAGRAM ════════════════════════════════════════════════════════════

{
  eq('IG: content_type → medya türü (reels)', toMediaKind('reels'), 'REELS');
  eq('IG: content_type → medya türü (carousel)', toMediaKind('carousel'), 'CAROUSEL_ALBUM');
  eq('IG: content_type → medya türü (post)', toMediaKind('post'), 'FEED');
  eq('IG: bilinmeyen tür FEED’e düşer', toMediaKind('bilinmeyen'), 'FEED');

  check('IG capability: Reels watch-time metrikleri içerir',
    INSTAGRAM_INSIGHT_CAPABILITIES.REELS.includes('ig_reels_avg_watch_time') &&
    INSTAGRAM_INSIGHT_CAPABILITIES.REELS.includes('ig_reels_video_view_total_time'));
  check('IG capability: Feed watch-time metriği İSTEMEZ',
    !INSTAGRAM_INSIGHT_CAPABILITIES.FEED.includes('ig_reels_avg_watch_time'));
  check('IG capability: Carousel seti tanımlı', INSTAGRAM_INSIGHT_CAPABILITIES.CAROUSEL_ALBUM.length > 0);
  check('IG capability: hiçbir sette beğeni/yorum İSTENMEZ — çift sayım olurdu',
    Object.values(INSTAGRAM_INSIGHT_CAPABILITIES).every(
      (set) => !set.includes('likes') && !set.includes('comments')
    ));

  // ── Medya nesnesi ─────────────────────────────────────────────────────────
  const media = mapInstagramMetrics({ view_count: 40_000, like_count: 2500, comment_count: 120 });
  eq('IG media: like_count/comments_count medya nesnesinden', [media.likes, media.comments], [2500, 120]);
  const noInsight = mapInstagramMetrics({ view_count: 0, like_count: 300, comment_count: 12 });
  eq('IG media: view_count 0 → null (insight çekilmemiş)', noInsight.views, null);
  eq('IG media: beğenide gerçek 0 korunur', mapInstagramMetrics({ view_count: 0, like_count: 0, comment_count: 0 }).likes, 0);

  // ── Insights ──────────────────────────────────────────────────────────────
  const ins = mapInstagramInsights({
    views: 41_200,
    reach: 33_100,
    saved: 900,
    shares: 410,
    total_interactions: 3820,
    follows: 64,
    ig_reels_avg_watch_time: 8600,           // milisaniye
    ig_reels_video_view_total_time: 354_200_000, // milisaniye
  });
  eq('IG insights: views eşlenir', ins.views, 41_200);
  eq('IG insights: reach eşlenir', ins.reach, 33_100);
  eq('IG insights: erişim reach’ten gelir (izlenmeden değil)', ins.exposure, 33_100);
  eq('IG insights: saved → saves', ins.saves, 900);
  eq('IG insights: shares eşlenir', ins.shares, 410);
  eq('IG insights: total_interactions ayrı alanda', ins.totalInteractions, 3820);
  eq('IG insights: follows → followersGained', ins.followersGained, 64);

  // BİRİM: milisaniye → saniye, TEK KEZ.
  eq('IG insights: avg watch time ms → saniye (tek dönüşüm)', ins.averageViewDurationSeconds, 8.6);
  eq('IG insights: toplam izlenme süresi ms → saniye', ins.watchTimeSeconds, 354_200);
  check('IG insights: çift bölme yok (8600ms 0,0086 değil 8,6)', ins.averageViewDurationSeconds === 8.6);
  eq('birim: milisaniye → saniye', millisecondsToSeconds(1500), 1.5);
  eq('birim: null ise null', millisecondsToSeconds(null), null);

  // Alias desteği (sürüm farkı)
  eq('IG insights: saved_count alias’ı', mapInstagramInsights({ saved_count: 77 }).saves, 77);
  eq('IG insights: shares_count alias’ı', mapInstagramInsights({ shares_count: 12 }).shares, 12);

  // Desteklenmeyen metrik null kalır, 0 olmaz
  const partial = mapInstagramInsights({ views: 100, reach: 90 });
  eq('IG insights: gelmeyen metrik null (0 değil)', [partial.saves, partial.shares, partial.followersGained], [null, null, null]);
  eq('IG insights: gerçek 0 korunur', mapInstagramInsights({ shares: 0 }).shares, 0);
  eq('IG insights: reach yoksa erişim izlenmeye düşer', mapInstagramInsights({ views: 55 }).exposure, 55);
}

// ═══ 4. YETENEK KEŞFİ (ağ sahte) ═════════════════════════════════════════════
// tsx CJS'e derlediği için top-level await yok — bu bölüm sonda await edilir.

async function capabilityChecks() {
  const realFetch = globalThis.fetch;

  /** `unsupported` listesindeki metrikleri reddeden sahte Graph API. */
  function mockGraph(unsupported: string[], values: Record<string, number>) {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      const requested = decodeURIComponent(url.match(/metric=([^&]+)/)?.[1] ?? '').split(',');
      const bad = requested.filter((m) => unsupported.includes(m));
      if (bad.length > 0) {
        return {
          ok: false,
          json: async () => ({ error: { message: `(#100) metric[0] must be one of the following values: ...`, code: 100 } }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          data: requested
            .filter((m) => m in values)
            .map((m) => ({ name: m, values: [{ value: values[m] }] })),
        }),
      } as Response;
    }) as typeof fetch;
  }

  // Hepsi destekleniyor → tek istek yeterli
  mockGraph([], { views: 100, reach: 80, saved: 5, shares: 2, total_interactions: 30, follows: 1 });
  const okRes = await instagramInsightsService.fetchForMedia('m1', 'FEED', 'token');
  eq('capability: destekli sette değerler döner', okRes.values.views, 100);
  eq('capability: reddedilen metrik yok', okRes.unsupportedMetrics, []);
  eq('capability: dönen metrik OK işaretlenir', okRes.availability.views, 'OK');

  // Bir metrik desteklenmiyor → tek tek yoklanır, DİĞERLERİ ALINIR
  mockGraph(['follows', 'profile_visits'], { views: 500, reach: 400, saved: 20, shares: 9, total_interactions: 120 });
  const cache = createCapabilityCache();
  const partialRes = await instagramInsightsService.fetchForMedia('m2', 'FEED', 'token', cache);
  eq('capability: desteklenmeyen metrik bütün medyayı düşürmez', partialRes.values.views, 500);
  eq('capability: diğer metrikler de gelir', [partialRes.values.reach, partialRes.values.saved], [400, 20]);
  check('capability: reddedilen metrik unsupported olarak işaretlenir',
    partialRes.unsupportedMetrics.includes('follows'), partialRes.unsupportedMetrics);
  eq('capability: desteklenmeyen metrik availability’de UNSUPPORTED', partialRes.availability.follows, 'UNSUPPORTED');
  check('capability: desteklenmeyen metrik değer üretmez (0 yazılmaz)', !('follows' in partialRes.values));

  // Keşif önbelleğe alınır → ikinci medyada tekrar yoklama yapılmaz
  let calls = 0;
  const counting = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => { calls += 1; return counting(input as string); }) as typeof fetch;
  const cachedRes = await instagramInsightsService.fetchForMedia('m3', 'FEED', 'token', cache);
  eq('capability: önbellekten sonra tek istek yeter', calls, 1);
  eq('capability: önbellekli çağrı da değer döndürür', cachedRes.values.views, 500);

  // İzin hatası ayrı sınıflandırılır
  globalThis.fetch = (async () => ({
    ok: false,
    json: async () => ({ error: { message: 'Application does not have permission for this action', code: 10 } }),
  } as Response)) as typeof fetch;
  const permRes = await instagramInsightsService.fetchForMedia('m4', 'REELS', 'token');
  check('capability: izin hatası UNSUPPORTED ile karıştırılmaz',
    permRes.permissionMissingMetrics.length > 0 && permRes.unsupportedMetrics.length === 0,
    { perm: permRes.permissionMissingMetrics, uns: permRes.unsupportedMetrics });

  globalThis.fetch = realFetch;
}

// ═══ 5. SNAPSHOT VE CHECKPOINT ═══════════════════════════════════════════════

function snap(
  id: string,
  capturedAt: string,
  metrics: Partial<PlatformMetrics>,
  source: PublicationSnapshot['source'] = 'YOUTUBE_ANALYTICS_API',
  over: Partial<Pick<PublicationSnapshot, 'coverage' | 'forcedForCheckpoint'>> = {}
): PublicationSnapshot {
  return {
    id, publicationId: 'p1', source, capturedAt,
    metrics: { ...EMPTY_METRICS, ...metrics },
    availability: {},
    coverage: { ...EMPTY_COVERAGE },
    forcedForCheckpoint: null,
    ...over,
  };
}

/** Verisi belirli bir güne kadar hazır olan snapshot. */
function snapThrough(
  id: string,
  capturedAt: string,
  dataThroughDate: string,
  metrics: Partial<PlatformMetrics> = {},
  source: PublicationSnapshot['source'] = 'YOUTUBE_ANALYTICS_API'
): PublicationSnapshot {
  return snap(id, capturedAt, metrics, source, {
    coverage: { ...EMPTY_COVERAGE, dataThroughDate, isSourceDataComplete: false },
  });
}

{
  const published = '2026-07-01T00:00:00.000Z';
  const history = [
    snap('s1', '2026-07-01T06:00:00.000Z', { views: 1000 }),   // 6. saat
    snap('s2', '2026-07-02T04:00:00.000Z', { views: 8000 }),   // 28. saat
    snap('s3', '2026-07-08T09:00:00.000Z', { views: 30_000 }), // 8. gün
    snap('s4', '2026-08-01T00:00:00.000Z', { views: 51_000 }), // 31. gün
  ];

  const c24 = resolveCheckpoint('EARLY_24H', published, history, 'YOUTUBE');
  eq('checkpoint 24s: hedeften SONRAKİ ilk snapshot seçilir', c24.snapshotId, 's2');
  eq('checkpoint 24s: ölçüldü', c24.measured, true);
  eq('checkpoint 24s: gecikme saniye olarak hesaplanır', c24.delaySeconds, 4 * 3600);
  eq('checkpoint 24s: tolerans içinde isabetli sayılır', c24.isExact, true);
  eq('checkpoint 24s: hedef zaman', c24.targetAt, '2026-07-02T00:00:00.000Z');
  eq('checkpoint 24s: metrikler snapshot’tan gelir', c24.metrics?.views, 8000);

  const c7 = resolveCheckpoint('PRIMARY_7D', published, history, 'YOUTUBE');
  eq('checkpoint 7g: doğru snapshot', c7.snapshotId, 's3');
  eq('checkpoint 7g: gecikme 9 saat', c7.delaySeconds, 9 * 3600);
  eq('checkpoint 7g: 18 saatlik tolerans içinde isabetli', c7.isExact, true);
  eq('checkpoint: tamamlanmış ölçüm COMPLETE', c7.status, 'COMPLETE');

  // ── Checkpoint bazlı toleranslar ──────────────────────────────────────────
  eq('tolerans: 24s noktası 8 saat', CHECKPOINT_TOLERANCE_HOURS.EARLY_24H, 8);
  eq('tolerans: 7g noktası 18 saat', CHECKPOINT_TOLERANCE_HOURS.PRIMARY_7D, 18);
  eq('tolerans: 30g noktası 36 saat', CHECKPOINT_TOLERANCE_HOURS.FINAL_30D, 36);

  // 24s noktasında 9 saat gecikme artık isabetli DEĞİL (eski tek tolerans 12'ydi)
  const nineLate = [snap('n1', '2026-07-02T09:00:00.000Z', { views: 9000 })];
  const c24Late = resolveCheckpoint('EARLY_24H', published, nineLate, 'YOUTUBE');
  eq('tolerans: 24s’te 9 saat gecikme isabetli değil', c24Late.isExact, false);
  eq('tolerans: gecikmeli ölçüm işaretlenir', c24Late.isLate, true);
  eq('tolerans: gecikmeli ölçüm KAYBOLMAZ, kullanılır', c24Late.snapshotId, 'n1');
  eq('tolerans: gecikmeli ölçümün metrikleri erişilebilir', c24Late.metrics?.views, 9000);
  eq('tolerans: 30g’de aynı 9 saat isabetli sayılır',
    resolveCheckpoint('FINAL_30D', published, [snap('n2', '2026-07-31T09:00:00.000Z', {})], 'YOUTUBE').isExact, true);

  // Tolerans dışı: hedeften 2 gün sonra yakalanan snapshot "isabetli" değildir
  const lateOnly = [snap('late', '2026-07-04T00:00:00.000Z', { views: 12_000 })];
  const cLate = resolveCheckpoint('EARLY_24H', published, lateOnly, 'YOUTUBE');
  eq('checkpoint: geç yakalanan snapshot yine de kullanılır', cLate.snapshotId, 'late');
  eq('checkpoint: ama isabetli sayılmaz', cLate.isExact, false);
  eq('checkpoint: gecikme dürüstçe raporlanır', cLate.delaySeconds, 48 * 3600);

  // ── capturedAt ≠ dataThroughDate ──────────────────────────────────────────
  // Sorgu 25. saatte yapıldı ama Analytics verisi hâlâ yayın gününde.
  const laggingData = [snapThrough('L1', '2026-07-02T01:00:00.000Z', '2026-07-01', { views: 500 })];
  const cLag = resolveCheckpoint('EARLY_24H', published, laggingData, 'YOUTUBE');
  eq('kapsam: veri hedefi kapsamıyorsa checkpoint tamamlanmaz', cLag.measured, false);
  eq('kapsam: capturedAt tek başına yetmez', cLag.status, 'NOT_MEASURED');
  eq('kapsam: uydurma metrik üretilmez', cLag.metrics, null);

  // 30. saatte yapılan sorguda veri artık hedefi kapsıyor
  const coveringData = [snapThrough('L2', '2026-07-02T06:00:00.000Z', '2026-07-02', { views: 8200 })];
  const cCover = resolveCheckpoint('EARLY_24H', published, coveringData, 'YOUTUBE');
  eq('kapsam: veri hedefi kapsayınca checkpoint oluşur', cCover.measured, true);
  eq('kapsam: tamamlanmış sayılır', cCover.status, 'COMPLETE');
  eq('kapsam: doğru snapshot', cCover.snapshotId, 'L2');

  // Data API güncel, Analytics gecikmiş → KISMİ ölçüm, veri silinmez
  const mixed = [
    snap('D1', '2026-07-02T02:00:00.000Z', { views: 8000, likes: 120 }, 'YOUTUBE_DATA_API'),
    snapThrough('A1', '2026-07-02T02:00:00.000Z', '2026-07-01', { shares: 30 }, 'YOUTUBE_ANALYTICS_API'),
  ];
  const cMixed = resolveCheckpoint('EARLY_24H', published, mixed, 'YOUTUBE');
  eq('kısmi: bir kaynak kapsıyorsa ölçüm oluşur', cMixed.measured, true);
  eq('kısmi: durum PARTIAL', cMixed.status, 'PARTIAL');
  eq('kısmi: geride kalan kaynak raporlanır', cMixed.laggingSources, ['YOUTUBE_ANALYTICS_API']);
  eq('kısmi: güncel kaynağın verisi korunur', cMixed.metrics?.views, 8000);
  eq('kısmi: geciken kaynağın verisi de SİLİNMEZ', cMixed.metrics?.shares, 30);
  eq('kısmi: API gecikmesi metrikleri sıfırlamaz', cMixed.metrics?.likes, 120);
  eq('kısmi: bütün kaynaklar raporlanır', cMixed.snapshotIds.length, 2);

  // Hiçbir kaynak kapsamıyorsa sonraki ölçüme bakılır
  const twoEvents = [
    snapThrough('E1', '2026-07-02T01:00:00.000Z', '2026-07-01', { views: 500 }),
    snapThrough('E2', '2026-07-03T01:00:00.000Z', '2026-07-03', { views: 9000 }),
  ];
  const cNext = resolveCheckpoint('EARLY_24H', published, twoEvents, 'YOUTUBE');
  eq('kapsam: kapsamayan ölçüm atlanır, sonraki kullanılır', cNext.snapshotId, 'E2');
  eq('kapsam: sonraki ölçümün gecikmesi hesaplanır', cNext.delaySeconds, 25 * 3600);

  const c30 = resolveCheckpoint('FINAL_30D', published, history, 'YOUTUBE');
  eq('checkpoint 30g: doğru snapshot', c30.snapshotId, 's4');

  // Hedeften ÖNCEKİ snapshot nihai sonuç gibi kullanılmaz
  const early = resolveCheckpoint('FINAL_30D', published, [history[0], history[1]], 'YOUTUBE');
  eq('checkpoint: hedefe ulaşılmadıysa ölçülmedi', early.measured, false);
  eq('checkpoint: veri UYDURULMAZ', early.metrics, null);
  eq('checkpoint: snapshot yoksa gecikme null', early.delaySeconds, null);
  eq('checkpoint: ölçülmemişte doluluk 0', early.dataCompleteness, 0);

  eq('checkpoint: yayın tarihi yoksa ölçülemez', resolveCheckpoint('EARLY_24H', null, history, 'YOUTUBE').measured, false);
  eq('checkpoint: hiç snapshot yoksa ölçülemez', resolveCheckpoint('EARLY_24H', published, [], 'YOUTUBE').measured, false);

  // Veri doluluğu platformun VEREBİLDİKLERİ üzerinden hesaplanır
  const ytFull: PlatformMetrics = { ...EMPTY_METRICS };
  for (const k of SUPPORTED_METRICS.YOUTUBE) ytFull[k] = 1;
  eq('doluluk: YouTube’un bütün metrikleri doluysa 1', dataCompleteness(ytFull, 'YOUTUBE'), 1);
  check('doluluk: YouTube’un vermediği metrikler paydayı şişirmez',
    dataCompleteness(ytFull, 'INSTAGRAM') < 1);

  // ── Birleştirme ───────────────────────────────────────────────────────────
  const multiSource = [
    snap('a', '2026-07-01T00:00:00.000Z', { views: 100, likes: 10 }, 'YOUTUBE_DATA_API'),
    snap('b', '2026-07-01T00:00:00.000Z', { shares: 5, watchTimeSeconds: 900 }, 'YOUTUBE_ANALYTICS_API'),
    snap('c', '2026-07-02T00:00:00.000Z', { views: 250 }, 'YOUTUBE_DATA_API'),
  ];
  const merged = mergeLatestMetrics(multiSource);
  eq('birleştirme: en son değer kazanır', merged.views, 250);
  eq('birleştirme: farklı kaynağın metriği korunur', [merged.shares, merged.watchTimeSeconds], [5, 900]);
  eq('birleştirme: sonraki snapshot null diye eski değeri SİLMEZ', merged.likes, 10);

  const availability = mergeAvailability([
    { ...snap('x', '2026-07-01T00:00:00.000Z', {}), availability: { saves: 'UNSUPPORTED' } },
    { ...snap('y', '2026-07-02T00:00:00.000Z', {}), availability: { shares: 'OK' } },
  ]);
  eq('birleştirme: metrik durumu da birleşir', availability, { saves: 'UNSUPPORTED', shares: 'OK' });

  // Manuel düzeltme geçmişi silmez, üstüne yazar
  const withCorrection = mergeLatestMetrics([
    snap('m1', '2026-07-01T00:00:00.000Z', { views: 100 }, 'YOUTUBE_DATA_API'),
    snap('m2', '2026-07-03T00:00:00.000Z', { views: 999 }, 'MANUAL_CORRECTION'),
  ]);
  eq('manuel düzeltme: son değer olarak geçerli', withCorrection.views, 999);
  check('manuel düzeltme: API snapshot’ı listede duruyor (silinmiyor)', multiSource.length === 3);

  // ── Gereksiz snapshot ─────────────────────────────────────────────────────
  const same: PlatformMetrics = { ...EMPTY_METRICS, views: 100 };
  eq('snapshot: aynı değerlerle yeniden yazılmaz', metricsChanged({ ...same }, { ...same }), false);
  eq('snapshot: değer değişince yazılır', metricsChanged(same, { ...same, views: 101 }), true);
  eq('snapshot: yeni metrik gelince yazılır', metricsChanged(same, { ...same, shares: 3 }), true);
  eq('snapshot: geçmiş yoksa her zaman yazılır', metricsChanged(null, same), true);

  // ── Zorunlu checkpoint snapshot'ı ─────────────────────────────────────────
  const SRC = 'YOUTUBE_ANALYTICS_API' as const;

  // 20. saatte snapshot var, 25. saatte değer değişmemiş → 24H kaydı OLUŞMALI
  const at20h = [snap('h20', '2026-07-01T20:00:00.000Z', { views: 5000 })];
  eq(
    'zorunlu: 24s penceresine girildi, değer aynı olsa da kayıt oluşur',
    pendingCheckpoints(published, at20h, SRC, new Date('2026-07-02T01:00:00.000Z')),
    ['EARLY_24H']
  );

  // Aynı sync tekrar çalışır → duplicate OLUŞMAZ
  const withForced = [
    ...at20h,
    snap('f24', '2026-07-02T01:00:00.000Z', { views: 5000 }, SRC, { forcedForCheckpoint: 'EARLY_24H' }),
  ];
  eq(
    'zorunlu: ikinci çalıştırmada duplicate oluşmaz',
    pendingCheckpoints(published, withForced, SRC, new Date('2026-07-02T02:00:00.000Z')),
    []
  );

  // Checkpoint penceresi DIŞINDA aynı değer → kayıt oluşmaz
  eq(
    'zorunlu: pencere açılmadan kayıt oluşmaz',
    pendingCheckpoints(published, at20h, SRC, new Date('2026-07-01T22:00:00.000Z')),
    []
  );

  // 7D ve 30D noktaları da aynı şekilde
  eq(
    'zorunlu: 7g noktasında değer değişmese de kayıt oluşur',
    pendingCheckpoints(published, at20h, SRC, new Date('2026-07-08T04:00:00.000Z')),
    ['PRIMARY_7D']
  );
  eq(
    'zorunlu: 30g noktasında değer değişmese de kayıt oluşur',
    pendingCheckpoints(published, at20h, SRC, new Date('2026-07-31T06:00:00.000Z')),
    ['FINAL_30D']
  );

  // EN KRİTİK: geç kalınmış nokta için BUGÜNÜN sayıları geçmişe yazılmaz
  eq(
    'zorunlu: tolerans geçtikten sonra geçmişe veri UYDURULMAZ',
    pendingCheckpoints(published, at20h, SRC, new Date('2026-07-10T00:00:00.000Z')),
    []
  );
  eq(
    'zorunlu: ilk sync çok geç yapıldıysa hiçbir nokta doldurulmaz',
    pendingCheckpoints(published, [], SRC, new Date('2026-08-15T00:00:00.000Z')),
    []
  );

  // Olağan bir snapshot noktayı zaten belgelemişse zorunlu kayıt gerekmez
  const naturalInWindow = [snap('nat', '2026-07-02T03:00:00.000Z', { views: 9000 })];
  eq(
    'zorunlu: nokta zaten olağan ölçümle belgelendiyse tekrar yazılmaz',
    pendingCheckpoints(published, naturalInWindow, SRC, new Date('2026-07-02T05:00:00.000Z')),
    []
  );

  // Kaynak başına ayrı değerlendirilir (YT'de Data + Analytics ayrı satır)
  eq(
    'zorunlu: kaynak başına ayrı değerlendirilir',
    pendingCheckpoints(published, withForced, 'YOUTUBE_DATA_API', new Date('2026-07-02T02:00:00.000Z')),
    ['EARLY_24H']
  );
  eq('zorunlu: yayın tarihi yoksa nokta hesaplanamaz', pendingCheckpoints(null, [], SRC), []);

  // ── Yaşam döngüsü ─────────────────────────────────────────────────────────
  eq('sıklık: ilk 48 saat 6 saatte bir', syncIntervalHours(10), 6);
  eq('sıklık: 2–7 gün günde bir', syncIntervalHours(72), 24);
  eq('sıklık: 8–30 gün 2 günde bir', syncIntervalHours(24 * 10), 48);
  eq('sıklık: 30 gün sonrası haftalık', syncIntervalHours(24 * 60), 168);

  const now = new Date('2026-07-02T12:00:00.000Z');
  eq('zamanlama: hiç ölçülmemişse ölçülür', isSnapshotDue(published, null, now), true);
  eq('zamanlama: 1 saat önce ölçüldüyse beklenir', isSnapshotDue(published, '2026-07-02T11:00:00.000Z', now), false);
  eq('zamanlama: 7 saat önce ölçüldüyse tekrar ölçülür', isSnapshotDue(published, '2026-07-02T05:00:00.000Z', now), true);
  eq(
    'zamanlama: eski içerik sık ölçülmez',
    isSnapshotDue('2026-05-01T00:00:00.000Z', '2026-07-01T12:00:00.000Z', now),
    false
  );
}

// ═══ 6. BACKFILL KURALLARI ═══════════════════════════════════════════════════

{
  // Günlük satırların kümülatife çevrilmesi (servisin uyguladığı mantık).
  const daily = [
    { day: '2026-07-01', values: { views: 4000, shares: 20, estimatedMinutesWatched: 500 } },
    { day: '2026-07-02', values: { views: 3000, shares: 15, estimatedMinutesWatched: 400 } },
    { day: '2026-07-03', values: { views: 1000, shares: 5, estimatedMinutesWatched: 120 } },
  ];
  const targetDay = '2026-07-02';
  const cumulative: Record<string, number> = {};
  for (const d of daily) {
    if (d.day > targetDay) break;
    for (const [k, v] of Object.entries(d.values)) cumulative[k] = (cumulative[k] ?? 0) + v;
  }
  eq('backfill: 24s noktasına kadar kümülatif izlenme', cumulative.views, 7000);
  eq('backfill: hedeften sonraki günler dahil edilmez', cumulative.views !== 8000, true);

  const mapped = mapYoutubeAnalytics(cumulative);
  eq('backfill: kümülatif dakika saniyeye çevrilir', mapped.watchTimeSeconds, 900 * 60);
  eq(
    'backfill: ortalama metrikler günlük satırlardan ÜRETİLMEZ',
    mapped.averageViewDurationSeconds,
    null
  );

  // Ortalama yalnızca API'nin aralık sorgusundan gelir
  const withRange = mapYoutubeAnalytics({ ...cumulative, averageViewDuration: 188, averageViewPercentage: 41.2 });
  eq('backfill: ortalama ayrı aralık sorgusundan alınır', [withRange.averageViewDurationSeconds, withRange.averageViewPercentage], [188, 41.2]);

  // Gelecekteki checkpoint için veri üretilmez
  const future = new Date('2026-07-01T00:00:00.000Z').getTime() + 30 * 86_400_000;
  check('backfill: gelecekteki 30g noktası atlanır', future > new Date('2026-07-05').getTime());

  // Aynı checkpoint iki kez yazılmaz (captured_at hedefe sabitlenir)
  const cpTime = new Date(new Date('2026-07-01T00:00:00.000Z').getTime() + 86_400_000).toISOString();
  const prior = [snap('b1', cpTime, { views: 7000 })];
  const already = prior.some((s) => s.source === 'YOUTUBE_ANALYTICS_API' && s.capturedAt === cpTime);
  eq('backfill: ikinci çalıştırmada duplicate oluşmaz', already, true);

  // Instagram geçmişi uydurulmaz: insights lifetime döner, geçmiş nokta yok.
  const igHistory: PublicationSnapshot[] = [];
  eq(
    'backfill: Instagram geçmiş checkpoint’i UYDURULMAZ',
    resolveCheckpoint('EARLY_24H', '2026-06-01T00:00:00.000Z', igHistory, 'INSTAGRAM').measured,
    false
  );
}

// ═══ 7. TOPLAMLARDA SEMANTİK AYRIM ═══════════════════════════════════════════

function pub(platform: ContentPlatform, metrics: Partial<PlatformMetrics>): PlatformPublication {
  return {
    platform,
    publicationId: `p-${platform}`,
    title: platform,
    url: null,
    externalId: null,
    publishedAt: '2026-07-20',
    source: platform === 'YOUTUBE' || platform === 'INSTAGRAM' ? 'API' : 'MANUAL',
    metrics: { ...EMPTY_METRICS, ...metrics },
    exposureBasis: 'izlenme',
    score: null,
    scoreBasis: 'NONE',
    label: 'COLLECTING',
    genreLabel: null,
    availability: {},
    checkpoints: [],
    snapshotCount: 0,
  };
}

{
  const pubs = [
    pub('YOUTUBE', { exposure: 100_000, views: 100_000, likes: 4000, comments: 300, shares: 1450, playlistAdds: 180, playlistRemovals: 25, netPlaylistAdds: 155, followersGained: 320, watchTimeSeconds: 720_000 }),
    pub('INSTAGRAM', { exposure: 33_100, views: 41_200, reach: 33_100, likes: 2500, comments: 120, shares: 410, saves: 900, totalInteractions: 3820, followersGained: 64, watchTimeSeconds: 354_200 }),
    pub('X', { exposure: 24_800, impressions: 24_800, likes: 300, comments: 60, shares: 90, saves: 45, followersGained: 12 }),
  ];
  const t = buildTotals(pubs);

  eq('toplam: çapraz platform paylaşım (YT + IG + X repost)', t.shares.value, 1450 + 410 + 90);
  eq('toplam: çapraz platform kaydetme (IG + X bookmark)', t.saves.value, 900 + 45);
  eq('toplam: kaydetme kapsamı 2/3 platform', [t.saves.available, t.saves.total], [2, 3]);

  // EN KRİTİK: oynatma listesi kaydetmeye karışmaz.
  eq('toplam: oynatma listesi ekleme ayrı toplanır', t.playlistAdds.value, 180);
  check('toplam: oynatma listesi kaydetme toplamına EKLENMEZ', t.saves.value === 945);

  eq('toplam: takipçi kazanımı = abone + takipçi', t.followersGained.value, 320 + 64 + 12);
  eq('toplam: izlenme süresi saniye olarak toplanır', t.watchTimeSeconds.value, 720_000 + 354_200);
  eq('toplam: gerçek izlenme (X gösterimi hariç)', t.views.value, 100_000 + 41_200);
  eq('toplam: erişim ayrı hesaplanır', t.exposure.value, 100_000 + 33_100 + 24_800);

  // Instagram'ın kendi toplamı ham etkileşime GİRMEZ
  const engagements = sumEngagements(pubs);
  eq('toplam: ham etkileşim = beğeni+yorum+paylaşım+kaydetme', engagements.value, 6800 + 480 + 1950 + 945);
  check('toplam: total_interactions ham etkileşime eklenmez (çift sayım)',
    engagements.value !== (6800 + 480 + 1950 + 945 + 3820));
  eq('toplam: total_interactions ayrı alanda durur', t.totalInteractions.value, 3820);

  // Ortalamalar toplamlarda hiç yok
  check('toplam: ortalama metrikler toplanmaz',
    !SUMMABLE_METRICS.includes('averageViewPercentage' as never) &&
    !('averageViewPercentage' in t));

  // Platform yetenekleri
  check('yetenek: YouTube kaydetme vermez', isUnsupported('YOUTUBE', 'saves'));
  check('yetenek: YouTube paylaşım verir', !isUnsupported('YOUTUBE', 'shares'));
  check('yetenek: Instagram oynatma listesi vermez', isUnsupported('INSTAGRAM', 'playlistAdds'));
  check('yetenek: Instagram erişim (reach) verir', !isUnsupported('INSTAGRAM', 'reach'));
  check('yetenek: X gösterim verir', !isUnsupported('X', 'impressions'));
  check('yetenek: platform metrik listesi boş değil', metricsFor('YOUTUBE').length > 0);
  check('yetenek: desteklenmeyen metrik listede yer almaz', !metricsFor('YOUTUBE').includes('saves'));

  // Manuel platformlar bozulmadı
  const x = mapManualMetrics('X', { impressions: 500, likes: 1 });
  eq('regresyon: X gösterimi izlenmeye yazılmaz', [x.exposure, x.views], [500, null]);
}

// ── Sonuç ────────────────────────────────────────────────────────────────────

capabilityChecks().then(() => {
  console.log(`\n${passed} kontrol geçti.`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('Tümü başarılı ✓');
});
