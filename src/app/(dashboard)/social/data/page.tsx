/**
 * VERİ MERKEZİ — "neyi tamamlamam gerekiyor?"
 *
 * Sistemin yönetim ekranı. Sıra bilinçli:
 *   1. Ayın tamamlanma durumu + tek birincil aksiyon (Eksik Verileri Tamamla)
 *   2. Veri kaynakları (otomatik gelenler neden gelmiyor)
 *   3. Hedefler ve ay notu
 *   4. Gelişmiş işlemler (kapalı) — manuel form, CSV, geçmişi doldur
 *
 * Genel Bakış ve Analiz bu araçlardan arınmış kalır.
 */

import { redirect } from 'next/navigation';
import { socialMetricsService, userService } from '@/services';
import { socialSummaryService } from '@/services/social-summary.service';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';
import { instagramService } from '@/services/instagram.service';
import { integrationHealthService } from '@/services/integration-health.service';
import { MonthPicker } from '../month-picker';
import { MetricsForm } from '../metrics-form';
import { YouTubeConnect } from '../youtube-connect';
import { InstagramConnect } from '../instagram-connect';
import { GoalProgress } from '../goal-progress';
import { MonthlyNotes } from '../monthly-notes';
import { resolveMonth } from '../month.utils';
import { CompletionPanel } from './completion-panel';
import { DataSources, type SourceStatus } from './data-sources';
import { AdvancedTools } from './advanced-tools';

export const dynamic = 'force-dynamic';

export default async function SocialDataPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/social');

  const { month: requested } = await searchParams;
  const available = await socialMetricsService.getAvailableMonths();
  const month = resolveMonth(requested, available);

  const [{ completeness }, goals, note, ytStatus, igStatus, health] = await Promise.all([
    socialSummaryService.getOverview(month),
    socialMetricsService.getGoalProgress(month),
    socialMetricsService.getNoteForMonth(month),
    youtubeAnalyticsService.getStatus(),
    instagramService.getStatus(),
    // Son senkron zamanı ve bağlantı uyarıları mevcut sağlık servisinden.
    integrationHealthService.getPlatformHealth().catch(() => []),
  ]);

  const healthOf = (platform: string) => health.find((h) => h.platform === platform);
  const sources: SourceStatus[] = [
    {
      platform: 'YOUTUBE',
      connected: ytStatus.connected,
      lastSyncAt: healthOf('YOUTUBE')?.lastSuccessfulSyncAt ?? null,
      detail: healthOf('YOUTUBE')?.warning ?? null,
    },
    {
      platform: 'INSTAGRAM',
      connected: igStatus.connected,
      lastSyncAt: healthOf('INSTAGRAM')?.lastSuccessfulSyncAt ?? null,
      detail: healthOf('INSTAGRAM')?.warning ?? null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          Eksik veriyi tamamla, kaynakları yönet
        </p>
        <MonthPicker month={month} available={available} />
      </div>

      <CompletionPanel completeness={completeness} />

      <DataSources statuses={sources} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div id="hedefler">
          <GoalProgress month={month} goals={goals} isAdmin />
        </div>
        <MonthlyNotes month={month} initialNotes={note?.notes || ''} isAdmin />
      </div>

      <AdvancedTools>
        <div className="flex flex-col gap-4">
          <YouTubeConnect connected={ytStatus.connected} />
          <InstagramConnect connected={igStatus.connected} username={igStatus.username} />
          <MetricsForm />
        </div>
      </AdvancedTools>
    </div>
  );
}
