/**
 * Haftalık İstihbarat Raporu
 * İçerik + Finans + Ekip — haftalık performans özeti
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { intelligenceReportService, getPrevWeekRange } from '@/services/intelligence-report.service';
import { userService } from '@/services';
import {
  CheckCircle2, XCircle, AlertCircle, TrendingUp,
  TrendingDown, Minus, Printer, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Helpers ──────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('tr-TR');
}

function fmtCurrency(n: number) {
  return `₺${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;
}

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: 'YouTube', INSTAGRAM: 'Instagram', X: 'Twitter/X',
};
const SUBTYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video', SHORTS: 'Shorts', REELS: 'Reels', POST: 'Gönderi',
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]' :
    score >= 60 ? 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]' :
    'bg-[var(--color-error-muted)] text-[var(--color-error)]';
  const label = score >= 80 ? 'İYİ' : score >= 60 ? 'ORTA' : 'DİKKAT';

  return (
    <div className={cn('flex flex-col items-center justify-center rounded-[var(--radius-lg)] px-6 py-4', color)}>
      <p className="text-4xl font-bold tabular-nums">{score}</p>
      <p className="text-xs font-semibold tracking-widest uppercase mt-1">{label}</p>
      <p className="text-[10px] opacity-70 mt-0.5">haftalık skor</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────

interface WeeklyReportPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function WeeklyReportPage({ searchParams }: WeeklyReportPageProps) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') redirect('/');

  const params = await searchParams;
  const report = await intelligenceReportService.getWeeklyReport(params.week);
  const prevWeek = getPrevWeekRange();

  return (
    <PageShell
      title="Haftalık Rapor"
      description={report.week.label}
    >
      {/* ── Nav ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-1 border-b border-[var(--color-border)] flex-1">
          <Link href="/reports" className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            Aylık Rapor
          </Link>
          <a href="/reports/weekly" className="border-b-2 border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
            Haftalık Rapor
          </a>
        </div>
        <button
          onClick={undefined}
          className="ml-4 flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors print:hidden"
          id="print-btn"
        >
          <Printer className="h-3.5 w-3.5" /> Yazdır / PDF
        </button>
      </div>

      {/* ── Üst Özet ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <ScoreBadge score={report.score} />

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">İçerik Üretimi</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {report.totalDone}
              <span className="text-sm font-normal text-[var(--color-text-muted)]">/{report.totalTarget}</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
              <div
                className={cn('h-full rounded-full transition-all',
                  report.contentAchievementPct >= 100 ? 'bg-[var(--color-success)]' :
                  report.contentAchievementPct >= 75 ? 'bg-[var(--color-warning)]' :
                  'bg-[var(--color-error)]'
                )}
                style={{ width: `${Math.min(report.contentAchievementPct, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">%{report.contentAchievementPct} tamamlandı</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Bu Hafta Net</p>
            <p className={cn('mt-2 text-2xl font-bold tabular-nums',
              report.weekNet >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            )}>
              {report.weekNet >= 0 ? '+' : '-'}{fmtCurrency(report.weekNet)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Gelir: {fmtCurrency(report.weekIncome)} · Gider: {fmtCurrency(report.weekExpense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">İş Kalemleri</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {report.completedWorkItems}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              tamamlandı · {report.pendingWorkItems} bekliyor
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── İçerik Hedef Tablosu ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                İçerik Üretim Tablosu
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)]">{report.week.label}</p>
            </CardHeader>
            <CardContent className="p-0">
              {report.contentRows.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                  Haftalık hedef belirlenmemiş
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                      {['Platform', 'Tür', 'Hedef', 'Yapılan', 'Fark', 'Durum'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.contentRows.map((row) => (
                      <tr key={`${row.platform}-${row.sub_type}`}
                        className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">
                          {PLATFORM_LABEL[row.platform]}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                          {SUBTYPE_LABEL[row.sub_type]}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-text-muted)]">
                          {row.target}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {row.done}
                        </td>
                        <td className={cn('px-4 py-3 text-sm font-semibold tabular-nums',
                          row.diff > 0 ? 'text-[var(--color-success)]' :
                          row.diff === 0 ? 'text-[var(--color-text-muted)]' :
                          'text-[var(--color-error)]'
                        )}>
                          {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </td>
                        <td className="px-4 py-3">
                          {row.status === 'hit' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                              <CheckCircle2 className="h-3 w-3" /> Tutturuldu
                            </span>
                          ) : row.status === 'close' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning)]">
                              <AlertCircle className="h-3 w-3" /> Yakın
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-error-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-error)]">
                              <XCircle className="h-3 w-3" /> Eksik
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--color-bg-secondary)]">
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-[var(--color-text-muted)]">TOPLAM</td>
                      <td className="px-4 py-2.5 text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{report.totalTarget}</td>
                      <td className="px-4 py-2.5 text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{report.totalDone}</td>
                      <td className={cn('px-4 py-2.5 text-sm font-bold tabular-nums',
                        report.totalDone >= report.totalTarget ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                      )}>
                        {report.totalDone - report.totalTarget > 0 ? '+' : ''}{report.totalDone - report.totalTarget}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-sm font-bold', report.contentAchievementPct >= 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]')}>
                          %{report.contentAchievementPct}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Finans Özeti ── */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">Haftalık Finans</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {[
                  { label: 'Gelir', value: report.weekIncome, color: 'text-[var(--color-success)]' },
                  { label: 'Gider', value: report.weekExpense, color: 'text-[var(--color-error)]' },
                  { label: 'Net', value: report.weekNet, color: report.weekNet >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-xs text-[var(--color-text-muted)]">{item.label}</p>
                    <p className={cn('text-lg font-bold tabular-nums mt-1', item.color)}>
                      {item.value >= 0 ? '' : '-'}{fmtCurrency(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sağ Panel: Vurgular & Eksikler ── */}
        <div className="space-y-4">
          {report.highlights.length > 0 && (
            <Card className="border-[var(--color-success)]/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--color-success)]">
                  <CheckCircle2 className="h-4 w-4" /> Bu Hafta İyi Gitti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-success)]" />
                    {h}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.gaps.length > 0 && (
            <Card className="border-[var(--color-error)]/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--color-error)]">
                  <XCircle className="h-4 w-4" /> Eksikler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-error)]" />
                    {g}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.highlights.length === 0 && report.gaps.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                Bu hafta henüz veri yok
              </CardContent>
            </Card>
          )}

          {/* Geçen haftaya git */}
          <Link
            href={`/reports/weekly?week=${prevWeek.start}`}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Geçen Haftayı Gör ({prevWeek.label})
          </Link>
        </div>
      </div>

      {/* Print script */}
      <script dangerouslySetInnerHTML={{
        __html: `document.getElementById('print-btn')?.addEventListener('click', () => window.print())`
      }} />
    </PageShell>
  );
}
