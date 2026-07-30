/**
 * Yayın metrik snapshot'ları — toplama, yazma, okuma ve checkpoint çözümü.
 *
 * Bu servis mevcut senkronizasyonların YERİNİ ALMAZ:
 *   - video_performance / instagram_media eskisi gibi doldurulur (Platform Bazlı
 *     ekran ve skorlama onlara dayanıyor, dokunulmadı)
 *   - burada YALNIZCA bir içerik kartına BAĞLI yayınlar için zaman serisi
 *     biriktirilir ve gelişmiş metrikler (izlenme süresi, paylaşım, abone,
 *     oynatma listesi) toplanır
 *
 * Platform bağımsızlığı: YouTube Analytics düşerse Instagram devam eder,
 * Instagram bir metrikte hata verirse diğer metrikler yazılır, hiçbir durumda
 * daha önce yazılmış geçerli veri silinmez.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  mapInstagramInsights,
  mapInstagramMetrics,
  mapManualMetrics,
  mapYoutubeAnalytics,
  mapYoutubeMetrics,
  overlayMetrics,
  IG_WATCH_TIME_UNIT,
  type ManualMetricRow,
  type ParseIssue,
} from '@/app/(dashboard)/icerik-performansi/content-impact.adapter';
import {
  isSnapshotDue,
  mergeAvailability,
  mergeLatestMetrics,
  metricsChanged,
  pendingCheckpoints,
  resolveCheckpoint,
  CHECKPOINTS,
  EMPTY_COVERAGE,
  type CheckpointKey,
  type CheckpointResult,
  type MetricAvailabilityMap,
  type PublicationSnapshot,
  type SnapshotSource,
  type SourceCoverage,
} from '@/app/(dashboard)/icerik-performansi/publication-snapshot.constants';
import {
  EMPTY_METRICS,
  METRIC_KEYS,
  type MetricKey,
  type PlatformMetrics,
} from '@/app/(dashboard)/icerik-performansi/content-impact.constants';
import type { ContentPlatform } from '@/app/(dashboard)/icerik-plani/content-queue.constants';
import { youtubeAnalyticsService } from './youtube-analytics.service';
import {
  createCapabilityCache,
  instagramInsightsService,
  toMediaKind,
  IG_GRAPH_HOST,
} from './instagram-insights.service';
import { instagramService } from './instagram.service';

/** DB kolon adı ↔ ortak model anahtarı. Tek eşleme noktası. */
const COLUMN_BY_METRIC: Record<MetricKey, string> = {
  exposure: 'exposure',
  views: 'views',
  engagedViews: 'engaged_views',
  reach: 'reach',
  impressions: 'impressions',
  likes: 'likes',
  comments: 'comments',
  shares: 'shares',
  saves: 'saves',
  totalInteractions: 'total_interactions',
  watchTimeSeconds: 'watch_time_seconds',
  averageViewDurationSeconds: 'average_view_duration_seconds',
  averageViewPercentage: 'average_view_percentage',
  followersGained: 'followers_gained',
  followersLost: 'followers_lost',
  playlistAdds: 'playlist_adds',
  playlistRemovals: 'playlist_removals',
  netPlaylistAdds: 'net_playlist_adds',
};

interface SnapshotRow {
  id: string;
  publication_id: string;
  source: string;
  captured_at: string;
  api_metric_availability: MetricAvailabilityMap | null;
  [column: string]: unknown;
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowToSnapshot(row: SnapshotRow): PublicationSnapshot {
  const metrics: PlatformMetrics = { ...EMPTY_METRICS };
  for (const key of METRIC_KEYS) metrics[key] = num(row[COLUMN_BY_METRIC[key]]);
  return {
    id: row.id,
    publicationId: row.publication_id,
    source: row.source as SnapshotSource,
    capturedAt: row.captured_at,
    metrics,
    availability: row.api_metric_availability ?? {},
    coverage: {
      reportStartDate: (row.report_start_date as string | null) ?? null,
      requestedEndDate: (row.requested_end_date as string | null) ?? null,
      dataThroughDate: (row.data_through_date as string | null) ?? null,
      isSourceDataComplete: (row.is_source_data_complete as boolean | null) ?? null,
      sourceLagSeconds: num(row.source_lag_seconds),
    },
    forcedForCheckpoint: (row.forced_for_checkpoint as CheckpointKey | null) ?? null,
  };
}

/** captured_at ile verinin kapsadığı günün sonu arasındaki gecikme. */
function lagSeconds(capturedAt: string, dataThroughDate: string | null): number | null {
  if (!dataThroughDate) return null;
  const endOfDay = Date.parse(`${dataThroughDate}T23:59:59.999Z`);
  if (!Number.isFinite(endOfDay)) return null;
  return Math.max(0, Math.round((new Date(capturedAt).getTime() - endOfDay) / 1000));
}

function metricsToColumns(metrics: PlatformMetrics): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const key of METRIC_KEYS) out[COLUMN_BY_METRIC[key]] = metrics[key];
  return out;
}

/** Bir kaynağın sahip OLMADIĞI metrikleri temizle — kaynaklar birbirini ezmesin. */
function only(metrics: PlatformMetrics, keys: MetricKey[]): PlatformMetrics {
  const out: PlatformMetrics = { ...EMPTY_METRICS };
  for (const k of keys) out[k] = metrics[k];
  return out;
}

/** YouTube Data API'nin sahibi olduğu alanlar. */
const YT_DATA_OWNED: MetricKey[] = ['exposure', 'views', 'likes', 'comments'];
/** Analytics'in sahibi olduğu alanlar — views/likes/comments Data API'de kalır. */
const YT_ANALYTICS_OWNED: MetricKey[] = [
  'engagedViews', 'shares', 'watchTimeSeconds', 'averageViewDurationSeconds',
  'averageViewPercentage', 'followersGained', 'followersLost',
  'playlistAdds', 'playlistRemovals', 'netPlaylistAdds',
];

export interface PlatformSyncReport {
  platform: ContentPlatform;
  publications: number;
  due: number;
  snapshotsWritten: number;
  /** Bunların kaçı bir ölçüm noktasını belgelemek için zorla yazıldı. */
  checkpointSnapshots: number;
  /** Kaynağın verisi hangi güne kadar hazır (YouTube Analytics). */
  dataThroughDate?: string | null;
  requestedMetrics: string[];
  returnedMetrics: string[];
  unsupportedMetrics: string[];
  permissionMissingMetrics: string[];
  failedMetrics: string[];
  parseIssues: ParseIssue[];
  error?: string;
}

export interface MetricsSyncResult {
  youtube: PlatformSyncReport;
  instagram: PlatformSyncReport;
}

function emptyReport(platform: ContentPlatform): PlatformSyncReport {
  return {
    platform, publications: 0, due: 0, snapshotsWritten: 0, checkpointSnapshots: 0,
    requestedMetrics: [], returnedMetrics: [], unsupportedMetrics: [],
    permissionMissingMetrics: [], failedMetrics: [], parseIssues: [],
  };
}

interface PublicationRef {
  id: string;
  platform: string;
  external_id: string | null;
  published_at: string | null;
}

/** content_publications satırı, elle girilen metrik alanlarıyla birlikte. */
interface PublicationRow extends ManualMetricRow {
  id: string;
  platform: string;
  published_at?: string | null;
}

/** API entegrasyonu olan platformlar — sayıları elle girilmez. */
const API_PLATFORMS: ContentPlatform[] = ['YOUTUBE', 'INSTAGRAM'];

export const publicationMetricsService = {
  // ── Okuma ─────────────────────────────────────────────────────────────────

  /** Verilen yayınların bütün snapshot'ları (yayın id → snapshot listesi). */
  async getSnapshots(publicationIds: string[]): Promise<Map<string, PublicationSnapshot[]>> {
    const out = new Map<string, PublicationSnapshot[]>();
    if (publicationIds.length === 0) return out;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('content_publication_metric_snapshots')
      .select('*')
      .in('publication_id', publicationIds)
      .order('captured_at', { ascending: true });

    // Tablo henüz migrate edilmediyse sayfa çalışmaya devam etmeli.
    if (error || !data) return out;

    for (const row of data as SnapshotRow[]) {
      const snap = rowToSnapshot(row);
      const arr = out.get(snap.publicationId) ?? [];
      arr.push(snap);
      out.set(snap.publicationId, arr);
    }
    return out;
  },

  /** Bir yayının 24s / 7g / 30g ölçüm noktaları. */
  resolveCheckpoints(
    publishedAt: string | null,
    snapshots: PublicationSnapshot[],
    platform: ContentPlatform
  ): CheckpointResult[] {
    return CHECKPOINTS.map((key) => resolveCheckpoint(key, publishedAt, snapshots, platform));
  },

  /** Snapshot geçmişinden birleşik güncel metrikler + metrik durumu. */
  latest(snapshots: PublicationSnapshot[]): { metrics: PlatformMetrics; availability: MetricAvailabilityMap } {
    return { metrics: mergeLatestMetrics(snapshots), availability: mergeAvailability(snapshots) };
  },

  // ── Yazma ─────────────────────────────────────────────────────────────────

  /**
   * Snapshot yaz.
   *
   * Olağan durumda aynı kaynağın son snapshot'ıyla metrikler birebir aynıysa
   * YAZILMAZ — geçmiş aynı satırla şişmesin.
   *
   * `forcedForCheckpoint` verildiğinde bu kontrol ATLANIR: değerler değişmemiş
   * olsa bile o ölçüm noktasının kaydı oluşmalı. Duplicate'i hem çağıran
   * (pendingCheckpoints) hem de kısmi unique index engeller.
   */
  async writeSnapshot(opts: {
    publicationId: string;
    source: SnapshotSource;
    metrics: PlatformMetrics;
    availability?: MetricAvailabilityMap;
    rawMetadata?: Record<string, unknown>;
    previous?: PublicationSnapshot[];
    capturedAt?: string;
    coverage?: SourceCoverage;
    forcedForCheckpoint?: CheckpointKey | null;
  }): Promise<{ written: boolean; error?: string }> {
    const forced = opts.forcedForCheckpoint ?? null;

    if (!forced) {
      const prevSameSource = (opts.previous ?? [])
        .filter((s) => s.source === opts.source)
        .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
      if (!metricsChanged(prevSameSource?.metrics ?? null, opts.metrics)) {
        return { written: false };
      }
    } else if ((opts.previous ?? []).some((s) => s.source === opts.source && s.forcedForCheckpoint === forced)) {
      // Bu nokta bu kaynak için zaten belgelenmiş.
      return { written: false };
    }

    const capturedAt = opts.capturedAt ?? new Date().toISOString();
    const coverage = opts.coverage ?? EMPTY_COVERAGE;

    const admin = createAdminClient();
    const { error } = await admin.from('content_publication_metric_snapshots').insert({
      publication_id: opts.publicationId,
      source: opts.source,
      captured_at: capturedAt,
      ...metricsToColumns(opts.metrics),
      report_start_date: coverage.reportStartDate,
      requested_end_date: coverage.requestedEndDate,
      data_through_date: coverage.dataThroughDate,
      is_source_data_complete: coverage.isSourceDataComplete,
      source_lag_seconds: coverage.sourceLagSeconds ?? lagSeconds(capturedAt, coverage.dataThroughDate),
      forced_for_checkpoint: forced,
      api_metric_availability: opts.availability ?? {},
      raw_metadata: opts.rawMetadata ?? {},
    });
    // Kısmi unique index duplicate'i reddederse bu bir hata değil, korumanın
    // çalışmasıdır — yarış durumunda ikinci yazım sessizce düşer.
    if (error && /duplicate key|unique constraint/i.test(error.message)) return { written: false };
    return error ? { written: false, error: error.message } : { written: true };
  },

  // ── Senkronizasyon ────────────────────────────────────────────────────────

  /**
   * Bağlı bütün YouTube/Instagram yayınları için ölçüm topla.
   *
   * `force` false ise yalnızca yaşam döngüsüne göre zamanı gelenler ölçülür;
   * manuel "Şimdi Senkronize Et" force=true ile çağrılır.
   */
  async syncAll({ force = false }: { force?: boolean } = {}): Promise<MetricsSyncResult> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('content_publications')
      .select('id, platform, external_id, published_at')
      .in('platform', ['YOUTUBE', 'INSTAGRAM'])
      .not('external_id', 'is', null);

    const pubs = (data ?? []) as PublicationRef[];
    const snapshots = await this.getSnapshots(pubs.map((p) => p.id));

    const [youtube, instagram] = await Promise.all([
      this.syncYoutube(pubs.filter((p) => p.platform === 'YOUTUBE'), snapshots, force).catch((e) => ({
        ...emptyReport('YOUTUBE'),
        error: e instanceof Error ? e.message : 'YouTube ölçümü başarısız',
      })),
      this.syncInstagram(pubs.filter((p) => p.platform === 'INSTAGRAM'), snapshots, force).catch((e) => ({
        ...emptyReport('INSTAGRAM'),
        error: e instanceof Error ? e.message : 'Instagram ölçümü başarısız',
      })),
    ]);

    return { youtube, instagram };
  },

  async syncYoutube(
    pubs: PublicationRef[],
    snapshots: Map<string, PublicationSnapshot[]>,
    force: boolean
  ): Promise<PlatformSyncReport> {
    const report = emptyReport('YOUTUBE');
    report.publications = pubs.length;
    if (pubs.length === 0) return report;

    const admin = createAdminClient();
    const issues: ParseIssue[] = [];

    // Yayın tarihi ve public sayılar mevcut video_performance satırından gelir.
    const videoIds = pubs.map((p) => p.external_id as string);
    const { data: videoData } = await admin
      .from('video_performance')
      .select('video_id, published_at, view_count, like_count, comment_count')
      .in('video_id', videoIds);
    const videoById = new Map(
      ((videoData ?? []) as { video_id: string; published_at: string | null; view_count: number; like_count: number; comment_count: number }[])
        .map((v) => [v.video_id, v])
    );

    const now = new Date();
    const publishedOf = (p: PublicationRef) =>
      p.published_at ?? videoById.get(p.external_id as string)?.published_at ?? null;

    // Ölçüm noktası penceresi açıksa yaşam döngüsü aralığı beklenmeden ölçülür —
    // aksi halde 7. gün noktası günlük cron ile kaçırılabilir.
    const due = pubs.filter((p) => {
      const prev = snapshots.get(p.id) ?? [];
      const last = prev[prev.length - 1]?.capturedAt ?? null;
      const published = publishedOf(p);
      if (force || isSnapshotDue(published, last)) return true;
      return (
        pendingCheckpoints(published, prev, 'YOUTUBE_DATA_API', now).length > 0 ||
        pendingCheckpoints(published, prev, 'YOUTUBE_ANALYTICS_API', now).length > 0
      );
    });
    report.due = due.length;
    if (due.length === 0) return report;

    const capturedAt = now.toISOString();

    // 1. Data API tarafı — canlı sayaçlar, verisi ölçüm anına kadar geçerli.
    for (const p of due) {
      const v = videoById.get(p.external_id as string);
      if (!v) continue;
      const prev = snapshots.get(p.id) ?? [];
      const forced = pendingCheckpoints(publishedOf(p), prev, 'YOUTUBE_DATA_API', now)[0] ?? null;
      const metrics = only(mapYoutubeMetrics(v), YT_DATA_OWNED);
      const res = await this.writeSnapshot({
        publicationId: p.id,
        source: 'YOUTUBE_DATA_API',
        metrics,
        availability: Object.fromEntries(YT_DATA_OWNED.map((k) => [k, 'OK' as const])),
        rawMetadata: { api: 'youtube/v3 videos.list', fields: 'statistics' },
        previous: prev,
        capturedAt,
        // statistics canlı sayaçtır, rapor gecikmesi yoktur.
        coverage: {
          reportStartDate: null,
          requestedEndDate: capturedAt.slice(0, 10),
          dataThroughDate: capturedAt.slice(0, 10),
          isSourceDataComplete: true,
          sourceLagSeconds: 0,
        },
        forcedForCheckpoint: forced,
      });
      if (res.written) report.snapshotsWritten += 1;
      if (forced) report.checkpointSnapshots += 1;
    }

    // 2. Analytics tarafı — bağımsız. Hata verirse yukarıdaki veri korunur.
    const startDate = due
      .map((p) => p.published_at ?? videoById.get(p.external_id as string)?.published_at)
      .filter((d): d is string => Boolean(d))
      .sort()[0] ?? capturedAt;

    // Analytics'in verisi hangi güne kadar hazır — checkpoint'in tamamlanmış
    // sayılıp sayılmayacağı buna bakar, sorgu anına değil.
    const coverageProbe = await youtubeAnalyticsService.getDataThroughDate();
    report.dataThroughDate = coverageProbe.dataThroughDate;

    const analytics = await youtubeAnalyticsService.queryVideoMetrics(
      due.map((p) => p.external_id as string),
      { startDate }
    );
    report.requestedMetrics = analytics.requestedMetrics;
    report.returnedMetrics = analytics.returnedMetrics;
    report.unsupportedMetrics = analytics.unsupportedMetrics;
    if (analytics.error) {
      report.error = analytics.error;
      report.parseIssues = issues;
      return report; // Data API snapshot'ları yazıldı, onlar korunuyor.
    }

    const coverage: SourceCoverage = {
      reportStartDate: startDate.slice(0, 10),
      requestedEndDate: coverageProbe.requestedEndDate,
      dataThroughDate: coverageProbe.dataThroughDate,
      isSourceDataComplete:
        coverageProbe.dataThroughDate == null
          ? null
          : coverageProbe.dataThroughDate >= coverageProbe.requestedEndDate,
      sourceLagSeconds: lagSeconds(capturedAt, coverageProbe.dataThroughDate),
    };

    const byVideo = new Map(analytics.rows.map((r) => [r.videoId, r.values]));
    const pubByVideo = new Map(due.map((p) => [p.external_id as string, p]));

    for (const [videoId, values] of byVideo) {
      const p = pubByVideo.get(videoId);
      if (!p) continue;
      const prev = snapshots.get(p.id) ?? [];
      const forced = pendingCheckpoints(publishedOf(p), prev, 'YOUTUBE_ANALYTICS_API', now)[0] ?? null;
      const mapped = only(mapYoutubeAnalytics(values, issues), YT_ANALYTICS_OWNED);
      const availability: MetricAvailabilityMap = {};
      for (const k of YT_ANALYTICS_OWNED) availability[k] = mapped[k] != null ? 'OK' : 'UNSUPPORTED';

      const res = await this.writeSnapshot({
        publicationId: p.id,
        source: 'YOUTUBE_ANALYTICS_API',
        metrics: mapped,
        availability,
        rawMetadata: {
          api: 'youtubeAnalytics/v2 reports',
          range: { startDate, requestedEndDate: coverage.requestedEndDate, dataThroughDate: coverage.dataThroughDate },
          watchTimeUnit: 'estimatedMinutesWatched→seconds',
          unsupported: analytics.unsupportedMetrics,
        },
        previous: prev,
        capturedAt,
        coverage,
        forcedForCheckpoint: forced,
      });
      if (res.written) report.snapshotsWritten += 1;
      if (forced) report.checkpointSnapshots += 1;
    }

    report.parseIssues = issues;
    return report;
  },

  async syncInstagram(
    pubs: PublicationRef[],
    snapshots: Map<string, PublicationSnapshot[]>,
    force: boolean
  ): Promise<PlatformSyncReport> {
    const report = emptyReport('INSTAGRAM');
    report.publications = pubs.length;
    if (pubs.length === 0) return report;

    const auth = await instagramService.getValidToken();
    if (!auth) {
      report.error = 'Instagram bağlı değil';
      return report;
    }

    const admin = createAdminClient();
    const issues: ParseIssue[] = [];

    // Yayın shortcode taşır; insights media_id ister — permalink üzerinden eşle.
    const { data: mediaData } = await admin
      .from('instagram_media')
      .select('media_id, permalink, content_type, published_at, view_count, like_count, comment_count');
    const media = (mediaData ?? []) as {
      media_id: string; permalink: string | null; content_type: string;
      published_at: string | null; view_count: number; like_count: number; comment_count: number;
    }[];
    const findMedia = (code: string) => media.find((m) => m.permalink?.includes(code));

    const now = new Date();
    const publishedOf = (p: PublicationRef) =>
      p.published_at ?? findMedia(p.external_id as string)?.published_at ?? null;

    const due = pubs.filter((p) => {
      const prev = snapshots.get(p.id) ?? [];
      const last = prev[prev.length - 1]?.capturedAt ?? null;
      const published = publishedOf(p);
      if (force || isSnapshotDue(published, last)) return true;
      return (
        pendingCheckpoints(published, prev, 'INSTAGRAM_MEDIA', now).length > 0 ||
        pendingCheckpoints(published, prev, 'INSTAGRAM_INSIGHTS', now).length > 0
      );
    });
    report.due = due.length;
    if (due.length === 0) return report;

    const capturedAt = now.toISOString();
    const cache = createCapabilityCache();
    // Instagram insights ömür boyu (lifetime) değer döndürür: veri her zaman
    // sorgu anına kadar geçerlidir, rapor gecikmesi yoktur.
    const liveCoverage: SourceCoverage = {
      reportStartDate: null,
      requestedEndDate: capturedAt.slice(0, 10),
      dataThroughDate: capturedAt.slice(0, 10),
      isSourceDataComplete: true,
      sourceLagSeconds: 0,
    };

    for (const p of due) {
      const m = findMedia(p.external_id as string);
      if (!m) continue;
      const prev = snapshots.get(p.id) ?? [];

      // 1. Medya nesnesi — beğeni/yorum her zaman buradan.
      const forcedMedia = pendingCheckpoints(publishedOf(p), prev, 'INSTAGRAM_MEDIA', now)[0] ?? null;
      const mediaMetrics = only(mapInstagramMetrics(m), ['exposure', 'views', 'likes', 'comments']);
      const mediaRes = await this.writeSnapshot({
        publicationId: p.id,
        source: 'INSTAGRAM_MEDIA',
        metrics: mediaMetrics,
        availability: { likes: 'OK', comments: 'OK' },
        rawMetadata: { api: `${IG_GRAPH_HOST}/me/media`, fields: 'like_count,comments_count' },
        previous: prev,
        capturedAt,
        coverage: liveCoverage,
        forcedForCheckpoint: forcedMedia,
      });
      if (mediaRes.written) report.snapshotsWritten += 1;
      if (forcedMedia) report.checkpointSnapshots += 1;

      // 2. Insights — desteklenmeyen metrik bu medyayı düşürmez.
      const kind = toMediaKind(m.content_type);
      const insights = await instagramInsightsService.fetchForMedia(m.media_id, kind, auth.token, cache);

      for (const list of ['requestedMetrics', 'returnedMetrics', 'unsupportedMetrics', 'permissionMissingMetrics', 'failedMetrics'] as const) {
        for (const name of insights[list]) {
          if (!report[list].includes(name)) report[list].push(name);
        }
      }
      if (insights.returnedMetrics.length === 0) continue;

      const mapped = mapInstagramInsights(insights.values, issues);
      const availability: MetricAvailabilityMap = {};
      // Insight metrik adı → ortak model anahtarı (availability için).
      const KEY_BY_INSIGHT: Record<string, MetricKey> = {
        views: 'views', reach: 'reach', saved: 'saves', saved_count: 'saves',
        shares: 'shares', shares_count: 'shares', total_interactions: 'totalInteractions',
        follows: 'followersGained', ig_reels_avg_watch_time: 'averageViewDurationSeconds',
        ig_reels_video_view_total_time: 'watchTimeSeconds',
      };
      for (const [insightName, state] of Object.entries(insights.availability)) {
        const key = KEY_BY_INSIGHT[insightName];
        if (key) availability[key] = state;
      }

      const res = await this.writeSnapshot({
        publicationId: p.id,
        source: 'INSTAGRAM_INSIGHTS',
        metrics: mapped,
        availability,
        rawMetadata: {
          api: `${IG_GRAPH_HOST}/{media}/insights`,
          mediaKind: kind,
          watchTimeUnit: IG_WATCH_TIME_UNIT,
          requested: insights.requestedMetrics,
          returned: insights.returnedMetrics,
          unsupported: insights.unsupportedMetrics,
        },
        previous: prev,
        capturedAt,
        coverage: liveCoverage,
        forcedForCheckpoint: pendingCheckpoints(publishedOf(p), prev, 'INSTAGRAM_INSIGHTS', now)[0] ?? null,
      });
      if (res.written) report.snapshotsWritten += 1;
    }

    report.parseIssues = issues;
    return report;
  },

  /**
   * Elle girilen platformların (TikTok / X / Twitch) sayılarını snapshot'a al.
   *
   * Bu platformlarda API yok — geçmişin tek kaynağı kullanıcının girdiği andır.
   * Yayın kaydı her güncellendiğinde çağrılır; sayılar değişmediyse yeni satır
   * yazılmaz. Kullanıcı bir ölçüm noktasının penceresi içindeyken giriyorsa
   * satır o noktaya bağlanır, böylece "24 saatte ne yaptı" sorusu TikTok ve X
   * için de cevaplanabilir hale gelir.
   *
   * Pencere kapandıktan sonra girilen sayı o noktaya İŞLENMEZ — 34. saatte
   * girilen rakam 24 saatlik sonuç değildir.
   */
  async recordManualEntry(cardId: string): Promise<{ written: number; checkpoints: number }> {
    const admin = createAdminClient();
    const out = { written: 0, checkpoints: 0 };

    const { data } = await admin
      .from('content_publications')
      .select('*')
      .eq('content_queue_id', cardId);
    const rows = (data ?? []) as (PublicationRow & { id: string })[];
    const manual = rows.filter((r) => !API_PLATFORMS.includes(r.platform as ContentPlatform));
    if (manual.length === 0) return out;

    const { data: card } = await admin
      .from('content_queue')
      .select('published_date')
      .eq('id', cardId)
      .maybeSingle();

    const snapshots = await this.getSnapshots(manual.map((r) => r.id));
    const now = new Date();
    const capturedAt = now.toISOString();

    for (const row of manual) {
      const platform = row.platform as ContentPlatform;
      const metrics = mapManualMetrics(platform, row);
      // Hiçbir sayı girilmemişse kayıt açmanın anlamı yok.
      if (METRIC_KEYS.every((k) => metrics[k] == null)) continue;

      const prev = snapshots.get(row.id) ?? [];
      const published = row.published_at ?? (card?.published_date as string | null) ?? null;
      const forced = pendingCheckpoints(published, prev, 'MANUAL', now)[0] ?? null;

      const res = await this.writeSnapshot({
        publicationId: row.id,
        source: 'MANUAL',
        metrics,
        availability: Object.fromEntries(
          METRIC_KEYS.filter((k) => metrics[k] != null).map((k) => [k, 'OK' as const])
        ),
        rawMetadata: { entry: 'elle giriş', platform },
        previous: prev,
        capturedAt,
        // Kullanıcı sayıları girdiği anı raporluyor; rapor gecikmesi yok.
        coverage: {
          reportStartDate: null,
          requestedEndDate: capturedAt.slice(0, 10),
          dataThroughDate: capturedAt.slice(0, 10),
          isSourceDataComplete: true,
          sourceLagSeconds: 0,
        },
        forcedForCheckpoint: forced,
      });
      if (res.written) out.written += 1;
      if (forced && res.written) out.checkpoints += 1;
    }

    return out;
  },

  // ── Geçmiş veri ───────────────────────────────────────────────────────────

  /**
   * YouTube geçmiş backfill'i: günlük Analytics dökümünü kümülatife çevirip
   * 24s / 7g / 30g noktalarına snapshot üretir.
   *
   * Ortalama metrikler (averageViewDuration / averageViewPercentage) günlük
   * satırlardan TOPLANMAZ — her checkpoint için ayrı aralık sorgusu yapılır,
   * böylece ağırlıklandırma API tarafında doğru şekilde yapılır.
   *
   * `dryRun` ile hiçbir şey yazılmaz; ne yazılacağı raporlanır.
   */
  async backfillYoutube({ dryRun = false, limit = 50 }: { dryRun?: boolean; limit?: number } = {}): Promise<{
    publications: number;
    snapshotsWritten: number;
    skipped: number;
    errors: string[];
  }> {
    const admin = createAdminClient();
    const out = { publications: 0, snapshotsWritten: 0, skipped: 0, errors: [] as string[] };

    const { data } = await admin
      .from('content_publications')
      .select('id, platform, external_id, published_at')
      .eq('platform', 'YOUTUBE')
      .not('external_id', 'is', null)
      .limit(limit);
    const pubs = (data ?? []) as PublicationRef[];
    out.publications = pubs.length;
    if (pubs.length === 0) return out;

    const { data: videoData } = await admin
      .from('video_performance')
      .select('video_id, published_at')
      .in('video_id', pubs.map((p) => p.external_id as string));
    const publishedById = new Map(
      ((videoData ?? []) as { video_id: string; published_at: string | null }[]).map((v) => [v.video_id, v.published_at])
    );

    const existing = await this.getSnapshots(pubs.map((p) => p.id));

    for (const p of pubs) {
      const videoId = p.external_id as string;
      const published = p.published_at ?? publishedById.get(videoId) ?? null;
      if (!published) { out.skipped += 1; continue; }

      const daily = await youtubeAnalyticsService.queryVideoDaily(videoId, published);
      if (daily.error) { out.errors.push(`${videoId}: ${daily.error}`); continue; }
      if (daily.days.length === 0) { out.skipped += 1; continue; }

      const publishedMs = new Date(published).getTime();
      const prior = existing.get(p.id) ?? [];

      for (const cp of CHECKPOINTS) {
        const offsetDays = cp === 'EARLY_24H' ? 1 : cp === 'PRIMARY_7D' ? 7 : 30;
        const targetMs = publishedMs + offsetDays * 86_400_000;
        // Gelecekteki bir checkpoint için veri UYDURULMAZ.
        if (targetMs > Date.now()) continue;
        const targetDay = new Date(targetMs).toISOString().slice(0, 10);

        // Kümülatif: yayından hedef güne kadarki günlük değerlerin toplamı.
        const cumulative: Record<string, number> = {};
        for (const d of daily.days) {
          if (d.day > targetDay) break;
          for (const [k, v] of Object.entries(d.values)) cumulative[k] = (cumulative[k] ?? 0) + v;
        }
        if (Object.keys(cumulative).length === 0) continue;

        // Ortalamalar API'den ayrı aralık sorgusuyla — toplanarak üretilmez.
        const range = await youtubeAnalyticsService.queryVideoRange(videoId, published, targetDay);
        const merged = { ...cumulative };
        for (const k of ['averageViewDuration', 'averageViewPercentage', 'engagedViews']) {
          if (range.values[k] != null) merged[k] = range.values[k];
        }

        const metrics = only(mapYoutubeAnalytics(merged), [...YT_DATA_OWNED, ...YT_ANALYTICS_OWNED]);
        // Checkpoint anını temsil eden zaman damgası — hedef günün sonu.
        const capturedAt = new Date(targetMs).toISOString();

        // İki kez çalıştırıldığında aynı satırı tekrar yazmasın: hem zaman
        // damgası hem checkpoint işareti sabit olduğu için kısmi unique index
        // de aynı sonucu veritabanı seviyesinde garanti eder.
        const already = prior.some(
          (s) => s.source === 'YOUTUBE_ANALYTICS_API' &&
            (s.capturedAt === capturedAt || s.forcedForCheckpoint === cp)
        );
        if (already) { out.skipped += 1; continue; }

        if (dryRun) { out.snapshotsWritten += 1; continue; }

        const res = await this.writeSnapshot({
          publicationId: p.id,
          source: 'YOUTUBE_ANALYTICS_API',
          metrics,
          availability: Object.fromEntries(
            [...YT_DATA_OWNED, ...YT_ANALYTICS_OWNED].map((k) => [k, metrics[k] != null ? 'OK' : 'UNSUPPORTED'])
          ),
          rawMetadata: {
            api: 'youtubeAnalytics/v2 reports (backfill)',
            checkpoint: cp,
            reconstructed: true,
            // Gerçekte hangi aralık sorgulandı.
            query: { dailyRange: { startDate: published.slice(0, 10), endDate: targetDay }, dimension: 'day' },
            // Hangi metrikler günlük toplamdan, hangileri dönem sorgusundan.
            cumulativeFromDaily: Object.keys(cumulative),
            fromRangeAggregate: ['averageViewDuration', 'averageViewPercentage', 'engagedViews']
              .filter((k) => range.values[k] != null),
            note: 'kümülatif günlük toplam; ortalamalar ayrı dönem sorgusundan (toplanarak üretilmedi)',
          },
          previous: prior,
          capturedAt,
          coverage: {
            reportStartDate: published.slice(0, 10),
            requestedEndDate: targetDay,
            dataThroughDate: targetDay,
            isSourceDataComplete: true,
            sourceLagSeconds: 0,
          },
          forcedForCheckpoint: cp,
        });
        if (res.written) out.snapshotsWritten += 1;
        else out.skipped += 1;
      }
    }

    return out;
  },

  /**
   * Elle düzeltme. API snapshot'ı DEĞİŞTİRİLMEZ — yeni bir MANUAL_CORRECTION
   * snapshot'ı yazılır ve gerekçesi denetim kaydına düşer.
   */
  async applyCorrection(opts: {
    publicationId: string;
    metrics: Partial<PlatformMetrics>;
    userId: string;
    reason: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const snapshots = (await this.getSnapshots([opts.publicationId])).get(opts.publicationId) ?? [];
    const current = mergeLatestMetrics(snapshots);
    const next = overlayMetrics(current, opts.metrics);

    const res = await this.writeSnapshot({
      publicationId: opts.publicationId,
      source: 'MANUAL_CORRECTION',
      metrics: next,
      availability: Object.fromEntries(
        (Object.keys(opts.metrics) as MetricKey[]).map((k) => [k, 'OK' as const])
      ),
      rawMetadata: { reason: opts.reason },
      previous: snapshots,
    });
    if (res.error) return { ok: false, error: res.error };

    const admin = createAdminClient();
    const audit = (Object.keys(opts.metrics) as MetricKey[]).map((k) => ({
      publication_id: opts.publicationId,
      changed_by: opts.userId,
      metric_key: k,
      old_value: current[k],
      new_value: opts.metrics[k] ?? null,
      reason: opts.reason,
    }));
    if (audit.length > 0) await admin.from('content_publication_metric_audit').insert(audit);

    return { ok: true };
  },
};
