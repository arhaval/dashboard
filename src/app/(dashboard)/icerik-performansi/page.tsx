import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { videoPerformanceService } from '@/services/video-performance.service';
import { instagramPerformanceService } from '@/services/instagram-performance.service';
import { ideaService } from '@/services/idea.service';
import { PerformanceTabs } from './performance-tabs';

export const dynamic = 'force-dynamic';

export default async function IcerikPerformansiPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const [videos, media, authorsByExternalId] = await Promise.all([
    videoPerformanceService.getAllScored(),
    instagramPerformanceService.getAllScored(),
    // Which content came from a Fikir Havuzu idea, and whose idea it was.
    ideaService.getAuthorsByPublication(),
  ]);
  const commentsEnabled = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <PageShell
      title="İçerik Performansı"
      description="YouTube videoların ve Instagram gönderilerin — türüne göre skorlanmış, en yeniden eskiye"
    >
      <PerformanceTabs videos={videos} media={media} commentsEnabled={commentsEnabled} authorsByExternalId={authorsByExternalId} />
    </PageShell>
  );
}
