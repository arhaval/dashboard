import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { videoPerformanceService } from '@/services/video-performance.service';
import { instagramPerformanceService } from '@/services/instagram-performance.service';
import { ideaService } from '@/services/idea.service';
import { contentImpactService } from '@/services/content-impact.service';
import { PerformanceTabs } from './performance-tabs';

export const dynamic = 'force-dynamic';
// Geri doldurma server action'ı video başına birkaç Analytics sorgusu yapar;
// varsayılan fonksiyon süresi bunun için dar kalıyor.
export const maxDuration = 60;

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

  // İçerik bazlı birleştirme skorlu veriyi yeniden sorgulamaz — yukarıda
  // çekilenleri kullanır. Client'a bütün korpus değil, YALNIZCA ilk sayfa iner;
  // filtre/sayfa değişimini fetchContentImpactPage server action'ı karşılar.
  const impactPage = await contentImpactService.getPage(undefined, { videos, media });

  return (
    <PageShell
      title="İçerik Performansı"
      description="Aynı içeriğin bütün platformlardaki toplam etkisi — ve platform platform kırılımı"
    >
      <PerformanceTabs
        videos={videos}
        media={media}
        commentsEnabled={commentsEnabled}
        authorsByExternalId={authorsByExternalId}
        impactPage={impactPage}
      />
    </PageShell>
  );
}
