/**
 * Aylık İstihbarat Raporu
 * Büyüme · İçerik · Sosyal · Finans — kapsamlı aylık özet
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { intelligenceReportService } from '@/services/intelligence-report.service';
import { userService } from '@/services';
import { MonthPicker } from './month-picker';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus,
  Youtube, Instagram, Tv2,
  BarChart3, Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('tr-TR');
}

function fmtCurrency(n: number) {
  return `₺${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;
}

function GrowthBadge({ pct, size = 'sm' }: { pct: number; size?: 'sm' | 'lg' }) {
  const positive = pct >= 0;
  const zero = pct === 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums',
      size === 'lg' ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]',
      zero ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]' :
      positive ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]' :
      'bg-[var(--color-error-muted)] text-[var(--color-error)]'
    )}>
      {zero ? <Minus className="h-3 w-3" /> : positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {zero ? 'Değişmedi' : `${positive ? '+' : ''}${pct}%`}
    </span>
  );
}

function MetricRow({ label, value, prev, unit = '' }: {
  label: string; value: number; prev: number; unit?: string;
}) {
  const pct = prev > 0 ? Math.round(((value - prev) / prev) * 100) : 0;
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
          {fmt(value)}{unit}
        </span>
        {prev > 0 && <GrowthBadge pct={pct} />}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────

interface ReportsPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') redirect('/');

  const params = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = params.month ?? currentMonth;

  // Generate last 12 months for the picker
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const [report, trend] = await Promise.all([
    intelligenceReportService.getMonthlyReport(month),
    intelligenceReportService.getGrowthTrend(6),
  ]);

  return (
    <PageShell
      title="Aylık Rapor"
      description={`${report.monthLabel} — kapsamlı performans analizi`}
    >
      {/* ── Nav ── */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex gap-1 border-b border-[var(--color-border)] flex-1">
          <a href="/reports" className="border-b-2 border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
            Aylık Rapor
          </a>
          <Link href="/reports/weekly" className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            Haftalık Rapor
          </Link>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <MonthPicker months={months} currentMonth={month} />
          <button
            onClick={undefined}
            id="print-btn"
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* ── Büyüme Skoru ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Büyüme Skoru', value: `${report.growthScore}/100`,
            sub: report.growthScore >= 70 ? 'İyi gidiyorsunuz' : report.growthScore >= 50 ? 'Geliştirilmeli' : 'Acil önlem gerekli',
            color: report.growthScore >= 70 ? 'text-[var(--color-success)]' : report.growthScore >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]',
          },
          {
            label: 'İçerik Üretimi', value: String(report.contentTotal),
            sub: `Geçen ay: ${report.contentPrevTotal}`,
            pct: report.contentGrowthPct,
          },
          {
            label: 'Hedef Başarısı', value: `%${report.goalAchievementPct}`,
            sub: `${report.overdueCount} gecikmiş görev`,
            color: report.goalAchievementPct >= 80 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]',
          },
          {
            label: 'Net Gelir', value: fmtCurrency(report.net),
            sub: `Gelir: ${fmtCurrency(report.income)} · Gider: ${fmtCurrency(report.expense)}`,
            pct: report.netPct,
          },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{card.label}</p>
              <p className={cn('mt-2 text-2xl font-bold tabular-nums', card.color ?? 'text-[var(--color-text-primary)]')}>
                {card.value}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                {card.pct !== undefined && <GrowthBadge pct={card.pct} />}
                <p className="text-xs text-[var(--color-text-muted)]">{card.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Sosyal Medya ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* YouTube */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500">
                  <Youtube className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">YouTube</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
                    {fmt(report.youtube.videoViews + report.youtube.shortsViews)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">toplam görüntüleme</p>
                </div>
                <GrowthBadge
                  pct={report.youtube.prevVideoViews > 0 ? Math.round(((report.youtube.videoViews - report.youtube.prevVideoViews) / report.youtube.prevVideoViews) * 100) : 0}
                  size="lg"
                />
              </div>
              <MetricRow label="Video görüntüleme" value={report.youtube.videoViews} prev={report.youtube.prevVideoViews} />
              <MetricRow label="Shorts görüntüleme" value={report.youtube.shortsViews} prev={report.youtube.prevShortsViews} />
              <MetricRow label="Canlı görüntüleme" value={report.youtube.liveViews} prev={0} />
              <MetricRow label="Beğeni" value={report.youtube.totalLikes} prev={0} />
              <MetricRow label="Yorum" value={report.youtube.totalComments} prev={0} />
              <MetricRow label="Toplam abone" value={report.youtube.subscribersTotal} prev={report.youtube.prevSubscribersTotal} />
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Instagram className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">Instagram</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
                    {fmt(report.instagram.views)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">görüntüleme</p>
                </div>
                <GrowthBadge
                  pct={report.instagram.prevViews > 0 ? Math.round(((report.instagram.views - report.instagram.prevViews) / report.instagram.prevViews) * 100) : 0}
                  size="lg"
                />
              </div>
              <MetricRow label="Beğeni" value={report.instagram.likes} prev={0} />
              <MetricRow label="Yorum" value={report.instagram.comments} prev={0} />
              <MetricRow label="Kaydetme" value={report.instagram.saves} prev={0} />
              <MetricRow label="Paylaşım" value={report.instagram.shares} prev={0} />
              <MetricRow label="Takipçi" value={report.instagram.followersTotal} prev={report.instagram.prevFollowersTotal} />
            </CardContent>
          </Card>

          {/* Twitch */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600">
                  <Tv2 className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">Twitch</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
                    {fmt(report.twitch.liveViews)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">canlı izlenme</p>
                </div>
                <GrowthBadge
                  pct={report.twitch.prevLiveViews > 0 ? Math.round(((report.twitch.liveViews - report.twitch.prevLiveViews) / report.twitch.prevLiveViews) * 100) : 0}
                  size="lg"
                />
              </div>
              <MetricRow label="Ort. izleyici" value={report.twitch.avgViewers} prev={0} />
              <MetricRow label="Zirve izleyici" value={report.twitch.peakViewers} prev={0} />
              <MetricRow label="Abone" value={report.twitch.subsTotal} prev={0} />
              <MetricRow label="Yayın süresi" value={Math.round(report.twitch.totalStreamMinutes / 60)} prev={0} unit=" sa" />
            </CardContent>
          </Card>
        </div>

        {/* ── Sağ Panel ── */}
        <div className="space-y-4">
          {/* Finans */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">Finansal Özet</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { label: 'Gelir', value: report.income, prev: report.prevIncome, pct: report.incomePct, color: 'text-[var(--color-success)]' },
                { label: 'Gider', value: report.expense, prev: report.prevExpense, pct: report.expensePct, color: 'text-[var(--color-error)]' },
                { label: 'Net', value: report.net, prev: report.prevNet, pct: report.netPct, color: report.net >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-bold tabular-nums', row.color)}>
                      {fmtCurrency(row.value)}
                    </span>
                    <GrowthBadge pct={row.pct} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* İçerik Dağılımı */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">İçerik Dağılımı</CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">Tamamlanan içerikler</p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { label: 'Kurgu (EDIT)', value: report.byType.EDIT, color: 'bg-[var(--color-success)]' },
                { label: 'Seslendirme (VOICE)', value: report.byType.VOICE, color: 'bg-[var(--color-info)]' },
                { label: 'Yayın (STREAM)', value: report.byType.STREAM, color: 'bg-[var(--color-accent)]' },
              ].map((row) => {
                const pct = report.contentTotal > 0 ? Math.round((row.value / report.contentTotal) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-[var(--color-text-secondary)]">{row.label}</span>
                      <span className="text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
                        {row.value} <span className="text-[var(--color-text-muted)] font-normal">(%{pct})</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                      <div className={cn('h-full rounded-full transition-all', row.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 6 Aylık Trend */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                <BarChart3 className="h-4 w-4 text-[var(--color-accent)]" />
                6 Aylık Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {trend.map((t) => (
                <div key={t.month} className="flex items-center justify-between py-1">
                  <span className={cn('text-xs font-medium', t.month === month ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]')}>
                    {t.label}
                    {t.month === month && ' ●'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                      {t.content} içerik
                    </span>
                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                      {fmt(t.ytViews + t.igViews)} görüntüleme
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `document.getElementById('print-btn')?.addEventListener('click', () => window.print())`
      }} />
    </PageShell>
  );
}
