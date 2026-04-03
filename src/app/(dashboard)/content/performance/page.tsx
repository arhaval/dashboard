/**
 * İçerik Performans & ROI Sayfası
 * Platform bazlı + içerik türü bazlı görüntüleme analizi
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { contentPlanService, userService } from '@/services';
import { socialMetricsService } from '@/services';
import { RoiTrendChart } from './roi-charts';
import { Youtube, Instagram, TrendingUp, Film, Mic, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatViews(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function avg(views: number, count: number) {
  if (count === 0) return '—';
  return formatViews(Math.round(views / count));
}

// ─────────────────────────────────────────────
// Platform Card
// ─────────────────────────────────────────────

function PlatformCard({
  name,
  icon: Icon,
  iconColor,
  views,
  contentCount,
  contentLabel,
  avgViews,
  subMetrics,
}: {
  name: string;
  icon: React.ElementType;
  iconColor: string;
  views: number;
  contentCount: number;
  contentLabel: string;
  avgViews: string;
  subMetrics?: Array<{ label: string; value: string }>;
}) {
  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconColor)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
            {name}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Main metric */}
        <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
          {formatViews(views)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">bu ay görüntüleme</p>

        <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">{contentLabel}</span>
            <span className="text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">
              {contentCount} içerik
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">İçerik başına ort.</span>
            <span className={cn(
              'text-sm font-bold tabular-nums',
              views > 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
            )}>
              {avgViews}
            </span>
          </div>
          {subMetrics?.map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">{m.label}</span>
              <span className="text-xs font-medium tabular-nums text-[var(--color-text-secondary)]">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Content Type Row
// ─────────────────────────────────────────────

function ContentTypeCard({
  icon: Icon,
  label,
  count,
  color,
  platforms,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  platforms: Array<{
    name: string;
    views: number;
    avgPerContent: string;
    color: string;
  }>;
}) {
  const totalViews = platforms.reduce((s, p) => s + p.views, 0);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Left: type info */}
          <div className="flex-shrink-0 text-center">
            <div className={cn(
              'mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-lg',
              color
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {label}
            </p>
            <p className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {count}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">içerik</p>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-[var(--color-border)]" />

          {/* Right: platform breakdown */}
          <div className="flex-1 space-y-3">
            {count === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] pt-2">
                Bu ay tamamlanan içerik yok
              </p>
            ) : (
              platforms.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: p.color }}>
                      {p.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatViews(p.views)} görüntüleme
                      </span>
                      <span className="text-xs font-bold tabular-nums text-[var(--color-accent)]">
                        {p.avgPerContent} / içerik
                      </span>
                    </div>
                  </div>
                  {/* Progress bar relative to totalViews */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: totalViews > 0 ? `${Math.round((p.views / totalViews) * 100)}%` : '0%',
                        backgroundColor: p.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}

            {/* Total reach */}
            {count > 0 && totalViews > 0 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2">
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                  Toplam erişim
                </span>
                <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                  {formatViews(totalViews)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

interface PerformancePageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function ContentPerformancePage({ searchParams }: PerformancePageProps) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const params = await searchParams;
  const month = params.month ?? getCurrentMonth();

  const [contentCounts, roiTrend, ytMetrics, igMetrics] = await Promise.all([
    contentPlanService.getCountByType(month),
    contentPlanService.getRoiTrend(6),
    socialMetricsService.getByMonthAndPlatform(month, 'YOUTUBE'),
    socialMetricsService.getByMonthAndPlatform(month, 'INSTAGRAM'),
  ]);

  // ── Platform view calculations ──
  const ytViews =
    (ytMetrics?.video_views ?? 0) +
    (ytMetrics?.shorts_views ?? 0) +
    (ytMetrics?.live_views ?? 0);

  const igViews = igMetrics?.views ?? 0;

  // YouTube is used by both EDIT and VOICE
  const ytContentCount = contentCounts.EDIT + contentCounts.VOICE;
  // Instagram is used by EDIT only (reels)
  const igContentCount = contentCounts.EDIT;

  // ── Trend data for chart ──
  const trendWithSocial = await Promise.all(
    roiTrend.map(async (point) => {
      const [yt, ig] = await Promise.all([
        socialMetricsService.getByMonthAndPlatform(point.month, 'YOUTUBE'),
        socialMetricsService.getByMonthAndPlatform(point.month, 'INSTAGRAM'),
      ]);
      return {
        label: point.label,
        edit: point.edit,
        voice: point.voice,
        youtube:
          (yt?.video_views ?? 0) + (yt?.shorts_views ?? 0) + (yt?.live_views ?? 0),
        instagram: ig?.views ?? 0,
      };
    })
  );

  const monthLabel = new Date(
    Number(month.split('-')[0]),
    Number(month.split('-')[1]) - 1,
    1
  ).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <PageShell
      title="İçerik Performansı"
      description={`${monthLabel} — platform ve içerik türü bazlı ROI analizi`}
    >
      {/* ── Nav tabs ── */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        <a
          href={`/content?month=${month}`}
          className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Takvim
        </a>
        <a
          href={`/content/performance?month=${month}`}
          className="border-b-2 border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]"
        >
          Performans & ROI
        </a>
      </div>

      {/* ── Platform Kartları ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlatformCard
          name="YouTube"
          icon={Youtube}
          iconColor="bg-[#FF0000]"
          views={ytViews}
          contentCount={ytContentCount}
          contentLabel="Kurgu + Seslendirme"
          avgViews={avg(ytViews, ytContentCount)}
          subMetrics={[
            {
              label: 'Video görüntüleme',
              value: formatViews(ytMetrics?.video_views ?? 0),
            },
            {
              label: 'Shorts görüntüleme',
              value: formatViews(ytMetrics?.shorts_views ?? 0),
            },
          ]}
        />
        <PlatformCard
          name="Instagram"
          icon={Instagram}
          iconColor="bg-gradient-to-br from-[#833AB4] to-[#E1306C]"
          views={igViews}
          contentCount={igContentCount}
          contentLabel="Reels (Kurgu)"
          avgViews={avg(igViews, igContentCount)}
          subMetrics={[
            {
              label: 'Beğeni',
              value: formatViews(igMetrics?.likes ?? 0),
            },
            {
              label: 'Kaydetme',
              value: formatViews(igMetrics?.saves ?? 0),
            },
          ]}
        />
      </div>

      {/* ── İçerik Türü Breakdown ── */}
      <div className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          İçerik Türü Bazlı Analiz
        </h2>

        <ContentTypeCard
          icon={Film}
          label="Kurgu"
          count={contentCounts.EDIT}
          color="bg-[var(--color-success)]"
          platforms={[
            {
              name: 'YouTube',
              views: ytViews,
              avgPerContent: avg(ytViews, contentCounts.EDIT),
              color: '#FF0000',
            },
            {
              name: 'Instagram',
              views: igViews,
              avgPerContent: avg(igViews, contentCounts.EDIT),
              color: '#E1306C',
            },
          ]}
        />

        <ContentTypeCard
          icon={Mic}
          label="Seslendirme"
          count={contentCounts.VOICE}
          color="bg-[var(--color-info)]"
          platforms={[
            {
              name: 'YouTube',
              views: ytViews,
              avgPerContent: avg(ytViews, contentCounts.VOICE),
              color: '#FF0000',
            },
          ]}
        />
      </div>

      {/* ── Trend Grafiği ── */}
      <div className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[var(--color-accent)]" />
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                6 Aylık Üretim & Görüntüleme Trendi
              </CardTitle>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Çubuklar: tamamlanan içerik sayısı — Çizgiler: platform görüntülemeleri
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <RoiTrendChart data={trendWithSocial} />
          </CardContent>
        </Card>
      </div>

      {/* ── Özet Insight ── */}
      {(ytViews > 0 || igViews > 0) && (
        <div className="mt-6">
          <Card className="border-[var(--color-accent)]/20 bg-[var(--color-accent-muted)]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-4 w-4 flex-shrink-0 text-[var(--color-accent)] mt-0.5" />
                <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {monthLabel} Özeti
                  </p>
                  {ytContentCount > 0 && (
                    <p>
                      {ytContentCount} içerikle YouTube&apos;da{' '}
                      <strong>{formatViews(ytViews)}</strong> görüntüleme —{' '}
                      içerik başına ortalama <strong>{avg(ytViews, ytContentCount)}</strong>.
                    </p>
                  )}
                  {contentCounts.EDIT > 0 && igViews > 0 && (
                    <p>
                      {contentCounts.EDIT} reels ile Instagram&apos;da{' '}
                      <strong>{formatViews(igViews)}</strong> görüntüleme —{' '}
                      reels başına ortalama <strong>{avg(igViews, contentCounts.EDIT)}</strong>.
                    </p>
                  )}
                  {ytViews === 0 && igViews === 0 && (
                    <p>Sosyal medya verileri henüz girilmemiş.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
