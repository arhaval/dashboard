import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { videoPerformanceService } from '@/services/video-performance.service';
import { ContentPerformanceGrid } from './content-performance-grid';

export const dynamic = 'force-dynamic';

export default async function IcerikPerformansiPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const videos = await videoPerformanceService.getAllScored();
  const commentsEnabled = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <PageShell
      title="İçerik Performansı"
      description="YouTube videolarının performansı — türüne göre skorlanmış, en yeniden eskiye"
    >
      <ContentPerformanceGrid videos={videos} commentsEnabled={commentsEnabled} />
    </PageShell>
  );
}
