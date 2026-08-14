/**
 * VERİ MERKEZİ — "neyi tamamlamam gerekiyor?"
 *
 * Sistemin yönetim ekranı: eksik veri, veri kaynakları, hedefler, ay notu ve
 * manuel giriş burada toplanır. Genel Bakış ve Analiz bunlardan arınmış kalır.
 *
 * Faz 3-4'te adım adım "Eksik Verileri Tamamla" sihirbazı ve Veri Kaynakları
 * bölümü eklenecek; şu an mevcut çalışan araçlar taşındı.
 */

import { redirect } from 'next/navigation';
import { socialMetricsService, userService } from '@/services';
import { socialSummaryService } from '@/services/social-summary.service';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';
import { instagramService } from '@/services/instagram.service';
import { MonthPicker } from '../month-picker';
import { EntryStatus } from '../entry-status';
import { MetricsForm } from '../metrics-form';
import { YouTubeConnect } from '../youtube-connect';
import { InstagramConnect } from '../instagram-connect';
import { GoalProgress } from '../goal-progress';
import { MonthlyNotes } from '../monthly-notes';
import { resolveMonth } from '../month.utils';

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

  const [{ completeness }, goals, note, ytStatus, igStatus] = await Promise.all([
    socialSummaryService.getOverview(month),
    socialMetricsService.getGoalProgress(month),
    socialMetricsService.getNoteForMonth(month),
    youtubeAnalyticsService.getStatus(),
    instagramService.getStatus(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          Eksik veriyi tamamla, kaynakları yönet
        </p>
        <MonthPicker month={month} available={available} />
      </div>

      <EntryStatus completeness={completeness} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div id="hedefler">
          <GoalProgress month={month} goals={goals} isAdmin />
        </div>
        <MonthlyNotes month={month} initialNotes={note?.notes || ''} isAdmin />
      </div>

      <div>
        <YouTubeConnect connected={ytStatus.connected} />
        <InstagramConnect connected={igStatus.connected} username={igStatus.username} />
        <MetricsForm />
      </div>
    </div>
  );
}
