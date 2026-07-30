/**
 * ContentPerformanceAggregationService — aynı üretimin bütün platformlardaki
 * toplam etkisi.
 *
 * Gruplama mevcut zincir üzerinden yapılır, yeni bir ana kayıt modeli KURULMAZ:
 *
 *   content_queue (ana içerik)
 *     └── content_publications (platform yayını, UNIQUE(card, platform))
 *           ├── YOUTUBE   → video_performance   (API, mevcut skorlu servis)
 *           ├── INSTAGRAM → instagram_media     (API, mevcut skorlu servis)
 *           └── TIKTOK / X / TWITCH             (elle girilen sayılar)
 *
 * Bir yayın hiçbir ana içeriğe bağlı değilse (pipeline dışında paylaşılmış eski
 * içerikler) BURADA GÖRÜNMEZ ve otomatik olarak bir içerikle eşleştirilmez —
 * yanlış eşleşme, eksik veriden daha kötüdür. Sayısı `unlinked` ile raporlanır,
 * kendileri Platform Bazlı görünümde olduğu gibi kalır.
 *
 * Skorlama yeniden yazılmaz: platform skoru mevcut servislerden gelir, yalnızca
 * skoru olmayan platformlar için kontrollü fallback uygulanır (resolveScore).
 *
 * SAYFALAMA NOTU — filtreleme ve sayfalama neden SQL'de değil:
 * platform içi kıyas ölçütü (benchmark) ve "veri kapsamı" bütün korpusa
 * bakmadan hesaplanamaz; elle girilen platformların tek veri kaynağı da
 * content_publications'ın tamamıdır. Bu yüzden toplama SUNUCUDA, tam korpus
 * üzerinde yapılır; client'a YALNIZCA istenen sayfa gider. content_publications
 * yayınlanan kart başına birkaç satırdır (yüzler mertebesi), tarayıcıya inen
 * yük ise sayfa boyutuyla sabittir.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildFacets,
  buildTotals,
  comparePlatforms,
  contentCode,
  deriveOverallStatus,
  engagementRate,
  matchesQuery,
  compareImpacts,
  normalizeQuery,
  resolveScore,
  EMPTY_METRICS,
  EXPOSURE_BASIS,
  MIN_SAMPLE_FOR_FALLBACK,
  type ContentImpact,
  type ContentImpactPage,
  type ContentImpactQuery,
  type PlatformBenchmark,
  type PlatformMetrics,
  type PlatformPublication,
  type PublicationCheckpoint,
} from '@/app/(dashboard)/icerik-performansi/content-impact.constants';
import {
  mapInstagramMetrics,
  mapManualMetrics,
  mapYoutubeMetrics,
  overlayMetrics,
  type ManualMetricRow,
} from '@/app/(dashboard)/icerik-performansi/content-impact.adapter';
import { CHECKPOINTS } from '@/app/(dashboard)/icerik-performansi/publication-snapshot.constants';
import { publicationMetricsService } from './publication-metrics.service';
import { VIDEO_GENRE_LABELS, type ScoredVideo } from '@/app/(dashboard)/icerik-performansi/perf.constants';
import { IG_GENRE_LABELS, type ScoredMedia } from '@/app/(dashboard)/icerik-performansi/ig-perf.constants';
import {
  extractInstagramShortcode,
  type ContentPlatform,
  type ContentQueueItem,
} from '@/app/(dashboard)/icerik-plani/content-queue.constants';
import { contentPerformanceRecommendationService } from './content-recommendation.service';
import { videoPerformanceService } from './video-performance.service';
import { instagramPerformanceService } from './instagram-performance.service';

/** content_publications satırı — yeni metrik kolonları migration'dan önce yok. */
interface PublicationRow extends ManualMetricRow {
  id: string;
  content_queue_id: string;
  platform: string;
  url: string | null;
  external_id: string | null;
  published_at?: string | null;
  title?: string | null;
}

/** API entegrasyonu olan platformlar — sayıları elle girilmez. */
const API_PLATFORMS: ContentPlatform[] = ['YOUTUBE', 'INSTAGRAM'];

/** Platform kırılımının sabit gösterim sırası. */
const PLATFORM_ORDER: ContentPlatform[] = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'X', 'TWITCH'];

/** Skorlu platform verisi — sayfa zaten çekiyorsa yeniden sorgulanmaz. */
export interface ImpactSources {
  videos: ScoredVideo[];
  media: ScoredMedia[];
}

/** Ortalama — örnek sayısı eşiğin altındaysa null. */
function avg(values: number[], minSample = MIN_SAMPLE_FOR_FALLBACK): number | null {
  if (values.length < minSample) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function hasText(v: string | null | undefined): boolean {
  return Boolean(v && v.trim());
}

/** Toplama sırasında kurulan ara kayıt — skor henüz atanmamış. */
type Draft = Omit<PlatformPublication, 'score' | 'scoreBasis' | 'label'> & {
  platformScore: number | null;
  thumbnail: string | null;
  /** Bu yayının metni elimizde mi (kütüphane ölçütü). */
  hasScript: boolean;
};

/** Snapshot toplanmamış yayın için nötr checkpoint listesi — veri uydurulmaz. */
function unmeasuredCheckpoints(): PublicationCheckpoint[] {
  return CHECKPOINTS.map((key) => ({
    key,
    measured: false,
    targetAt: '',
    actualCapturedAt: null,
    delaySeconds: null,
    isExact: false,
    isLate: false,
    status: 'NOT_MEASURED' as const,
    laggingSources: [],
    dataCompleteness: 0,
    metrics: null,
  }));
}

export const contentImpactService = {
  /**
   * Filtrelenmiş, sıralanmış ve sayfalanmış içerik listesi.
   *
   * `sources` verilirse skorlu YouTube/Instagram verisi yeniden sorgulanmaz —
   * sayfa bunları Platform Bazlı görünüm için zaten çekiyor.
   */
  async getPage(query?: Partial<ContentImpactQuery>, sources?: ImpactSources): Promise<ContentImpactPage> {
    const q = normalizeQuery(query);
    const { impacts, unlinked } = await this.buildAll(sources);

    const matched = impacts.filter((i) => matchesQuery(i, q));
    matched.sort((a, b) => compareImpacts(a, b, q.sort));

    const pageCount = Math.max(1, Math.ceil(matched.length / q.pageSize));
    // Filtre daraldığında client elinde kalan sayfa numarasıyla boş liste
    // görmemeli — sayfa mevcut aralığa çekilir.
    const page = Math.min(q.page, pageCount);
    const start = (page - 1) * q.pageSize;

    return {
      items: matched.slice(start, start + q.pageSize),
      total: matched.length,
      grandTotal: impacts.length,
      page,
      pageSize: q.pageSize,
      pageCount,
      facets: buildFacets(impacts),
      unlinked,
      query: { ...q, page },
    };
  },

  /**
   * Bütün ana içerikleri toplam etkisiyle kur. Filtre/sayfalama UYGULANMAZ —
   * kıyas ölçütleri ve filtre sayıları tam korpusa ihtiyaç duyar.
   */
  async buildAll(sources?: ImpactSources): Promise<{ impacts: ContentImpact[]; unlinked: { youtube: number; instagram: number } }> {
    const admin = createAdminClient();

    const { videos, media } = sources ?? {
      videos: await videoPerformanceService.getAllScored(),
      media: await instagramPerformanceService.getAllScored(),
    };

    // `select('*')` bilinçli: yeni metrik kolonları henüz migrate edilmemişse
    // sorgu hata vermek yerine o alanları döndürmez ve sayfa çalışmaya devam eder.
    const { data: pubData } = await admin.from('content_publications').select('*');
    const pubRows = (pubData ?? []) as PublicationRow[];

    const cardIds = [...new Set(pubRows.map((p) => p.content_queue_id))];
    if (cardIds.length === 0) {
      return { impacts: [], unlinked: this.countUnlinked([], videos, media) };
    }

    const { data: cardData } = await admin.from('content_queue').select('*').in('id', cardIds);
    const cards = (cardData ?? []) as ContentQueueItem[];
    const cardById = new Map(cards.map((c) => [c.id, c]));

    // ── Kaynak eşleme tabloları ───────────────────────────────────────────────
    const videoById = new Map(videos.map((v) => [v.video_id, v]));
    // Instagram yayınları shortcode ile bağlanır; medya satırı permalink taşır.
    const mediaByShortcode = new Map<string, ScoredMedia>();
    for (const m of media) {
      const code = m.permalink ? extractInstagramShortcode(m.permalink) : null;
      if (code) mediaByShortcode.set(code, m);
    }

    // ── Faz 1: yayınları metrikleriyle kur (skor henüz yok) ───────────────────
    const draftsByCard = new Map<string, Draft[]>();
    for (const row of pubRows) {
      const card = cardById.get(row.content_queue_id);
      if (!card) continue;
      const draft = this.toDraft(row, card, videoById, mediaByShortcode);
      const arr = draftsByCard.get(card.id) ?? [];
      arr.push(draft);
      draftsByCard.set(card.id, arr);
    }

    // ── Faz 1b: snapshot geçmişini bindir ────────────────────────────────────
    // Gelişmiş metrikler (izlenme süresi, paylaşım, abone, oynatma listesi)
    // API'den snapshot olarak toplanır; taban metrikler yerinde kalır. Snapshot
    // yoksa (migration/sync henüz yapılmadıysa) hiçbir şey değişmez.
    const snapshots = await publicationMetricsService.getSnapshots(pubRows.map((r) => r.id));
    for (const drafts of draftsByCard.values()) {
      for (const d of drafts) {
        const history = snapshots.get(d.publicationId) ?? [];
        d.snapshotCount = history.length;
        if (history.length === 0) continue;
        const { metrics, availability } = publicationMetricsService.latest(history);
        d.metrics = overlayMetrics(d.metrics, metrics);
        d.availability = availability;
        d.checkpoints = publicationMetricsService
          .resolveCheckpoints(d.publishedAt, history, d.platform)
          .map((c) => ({
            key: c.key,
            measured: c.measured,
            targetAt: c.targetAt,
            actualCapturedAt: c.actualCapturedAt,
            delaySeconds: c.delaySeconds,
            isExact: c.isExact,
            isLate: c.isLate,
            status: c.status,
            laggingSources: c.laggingSources,
            dataCompleteness: c.dataCompleteness,
            metrics: c.metrics,
          }));
      }
    }

    // ── Faz 2: platform içi kıyas ölçütleri ──────────────────────────────────
    const benchmarks = this.buildBenchmarks({ videos, media, drafts: [...draftsByCard.values()].flat() });

    // ── Faz 3: skor + toplam + karar ─────────────────────────────────────────
    const impacts: ContentImpact[] = [];
    for (const [cardId, drafts] of draftsByCard) {
      const card = cardById.get(cardId);
      if (!card) continue;

      const publications: PlatformPublication[] = drafts
        .map((d): PlatformPublication => {
          const { score, basis, label } = resolveScore(
            d.metrics,
            d.platformScore,
            benchmarks[d.platform],
            engagementRate(d)
          );
          return {
            platform: d.platform,
            publicationId: d.publicationId,
            title: d.title,
            url: d.url,
            externalId: d.externalId,
            publishedAt: d.publishedAt,
            source: d.source,
            metrics: d.metrics,
            exposureBasis: d.exposureBasis,
            genreLabel: d.genreLabel,
            availability: d.availability,
            checkpoints: d.checkpoints,
            snapshotCount: d.snapshotCount,
            score,
            scoreBasis: basis,
            label,
          };
        })
        // Platform sırası sabit olsun (deterministik çıktı).
        .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));

      const totals = buildTotals(publications);
      const comparison = comparePlatforms(publications);
      const verdict = deriveOverallStatus(publications);

      const dates = publications.map((p) => p.publishedAt).filter((d): d is string => Boolean(d));
      const firstPublishedAt = dates.length > 0
        ? dates.reduce((min, d) => (new Date(d) < new Date(min) ? d : min))
        : card.published_date;

      const base = {
        cardId: card.id,
        code: contentCode(card.id),
        title: card.title,
        contentType: card.content_type ?? '',
        // Kart metni ya da bağlı yayınlardan herhangi birinin script'i varsa
        // içeriğin metni elimizde demektir.
        inLibrary: hasText(card.content_text) || drafts.some((d) => d.hasScript),
        firstPublishedAt,
        plannedPlatforms: card.platforms ?? [],
        publications,
        totals,
        comparison,
        verdict,
        thumbnail: drafts.find((d) => d.thumbnail)?.thumbnail ?? null,
      };

      impacts.push({
        ...base,
        recommendation: contentPerformanceRecommendationService.evaluate(base, benchmarks),
      });
    }

    return { impacts, unlinked: this.countUnlinked(pubRows, videos, media) };
  },

  /**
   * Bir yayın kaydını ortak metrik kavramlarına map et.
   * Sayı eşlemesi content-impact.adapter.ts'te; burada yalnızca hangi kaynağın
   * kullanılacağı ve başlık/tarih/kapak seçimi var.
   */
  toDraft(
    row: PublicationRow,
    card: ContentQueueItem,
    videoById: Map<string, ScoredVideo>,
    mediaByShortcode: Map<string, ScoredMedia>
  ): Draft {
    const platform = row.platform as ContentPlatform;
    const source = API_PLATFORMS.includes(platform) ? ('API' as const) : ('MANUAL' as const);

    let metrics: PlatformMetrics = { ...EMPTY_METRICS };
    let platformScore: number | null = null;
    let genreLabel: string | null = null;
    let title = row.title?.trim() || card.title;
    let publishedAt: string | null = row.published_at ?? card.published_date;
    let thumbnail: string | null = null;
    let url = row.url;
    let hasScript = false;

    if (platform === 'YOUTUBE') {
      const v = row.external_id ? videoById.get(row.external_id) : undefined;
      if (v) {
        metrics = mapYoutubeMetrics(v);
        platformScore = v.score;
        genreLabel = VIDEO_GENRE_LABELS[v.effective_genre];
        title = row.title?.trim() || v.title;
        publishedAt = v.published_at ?? publishedAt;
        thumbnail = v.thumbnail_url;
        url = url ?? `https://youtu.be/${v.video_id}`;
        hasScript = hasText(v.script);
      }
    } else if (platform === 'INSTAGRAM') {
      const m = row.external_id ? mediaByShortcode.get(row.external_id) : undefined;
      if (m) {
        metrics = mapInstagramMetrics(m);
        platformScore = m.score;
        genreLabel = IG_GENRE_LABELS[m.effective_genre];
        title = row.title?.trim() || m.caption?.trim() || card.title;
        publishedAt = m.published_at ?? publishedAt;
        thumbnail = m.thumbnail_url;
        url = url ?? m.permalink;
        hasScript = hasText(m.script);
      }
    } else {
      metrics = mapManualMetrics(platform, row);
    }

    return {
      platform,
      publicationId: row.id,
      title,
      url,
      externalId: row.external_id,
      publishedAt,
      source,
      metrics,
      exposureBasis: EXPOSURE_BASIS[platform] ?? 'izlenme',
      genreLabel,
      // Snapshot bindirilene kadar nötr — Faz 1b dolduruyor.
      availability: {},
      checkpoints: unmeasuredCheckpoints(),
      snapshotCount: 0,
      platformScore,
      thumbnail,
      hasScript,
    };
  },

  /**
   * Platform içi kıyas ölçütleri. YouTube/Instagram için TÜM senkron korpus
   * kullanılır — bağlı yayınların birkaç tanesi güvenilir bir ortalama vermez.
   * Elle girilen platformlarda tek veri kaynağı content_publications olduğu için
   * ölçüt oradan hesaplanır.
   */
  buildBenchmarks({
    videos,
    media,
    drafts,
  }: {
    videos: ScoredVideo[];
    media: ScoredMedia[];
    drafts: { platform: ContentPlatform; metrics: PlatformMetrics }[];
  }): Partial<Record<ContentPlatform, PlatformBenchmark>> {
    const out: Partial<Record<ContentPlatform, PlatformBenchmark>> = {};

    // YouTube — izlenme + (beğeni + yorum) / izlenme
    const ytExposure: number[] = [];
    const ytRates: number[] = [];
    for (const v of videos) {
      const views = Number(v.view_count);
      if (!Number.isFinite(views) || views <= 0) continue;
      ytExposure.push(views);
      ytRates.push((Number(v.like_count) + Number(v.comment_count)) / views);
    }
    out.YOUTUBE = {
      platform: 'YOUTUBE',
      avgExposure: avg(ytExposure),
      avgEngagementRate: avg(ytRates),
      sampleSize: ytExposure.length,
    };

    // Instagram — aynı mantık, izlenmesi bilinen gönderiler üzerinden
    const igExposure: number[] = [];
    const igRates: number[] = [];
    for (const m of media) {
      const views = Number(m.view_count);
      if (!Number.isFinite(views) || views <= 0) continue;
      igExposure.push(views);
      igRates.push((Number(m.like_count) + Number(m.comment_count)) / views);
    }
    out.INSTAGRAM = {
      platform: 'INSTAGRAM',
      avgExposure: avg(igExposure),
      avgEngagementRate: avg(igRates),
      sampleSize: igExposure.length,
    };

    // Elle girilen platformlar
    for (const platform of ['TIKTOK', 'X', 'TWITCH'] as ContentPlatform[]) {
      const rows = drafts.filter((d) => d.platform === platform);
      const exposure: number[] = [];
      const rates: number[] = [];
      for (const r of rows) {
        const e = r.metrics.exposure;
        if (e == null || e <= 0) continue;
        exposure.push(e);
        const eng = (r.metrics.likes ?? 0) + (r.metrics.comments ?? 0) + (r.metrics.shares ?? 0) + (r.metrics.saves ?? 0);
        rates.push(eng / e);
      }
      out[platform] = {
        platform,
        avgExposure: avg(exposure),
        avgEngagementRate: avg(rates),
        sampleSize: exposure.length,
      };
    }

    return out;
  },

  /** Hiçbir ana içeriğe bağlanmamış yayın sayıları. */
  countUnlinked(
    pubRows: PublicationRow[],
    videos: ScoredVideo[],
    media: ScoredMedia[]
  ): { youtube: number; instagram: number } {
    const linkedYt = new Set(
      pubRows.filter((p) => p.platform === 'YOUTUBE' && p.external_id).map((p) => p.external_id as string)
    );
    const linkedIg = new Set(
      pubRows.filter((p) => p.platform === 'INSTAGRAM' && p.external_id).map((p) => p.external_id as string)
    );
    return {
      youtube: videos.filter((v) => !linkedYt.has(v.video_id)).length,
      instagram: media.filter((m) => {
        const code = m.permalink ? extractInstagramShortcode(m.permalink) : null;
        return !code || !linkedIg.has(code);
      }).length,
    };
  },
};
