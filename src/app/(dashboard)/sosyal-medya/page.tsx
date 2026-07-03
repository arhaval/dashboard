import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { contentQueueService } from '@/services/content-queue.service';
import { ContentTable } from './content-table';

export const dynamic = 'force-dynamic';

export default async function IcerikPlaniPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  if (!['ADMIN', 'PUBLISHER'].includes(currentUser.role)) {
    redirect('/');
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const items = await contentQueueService.getAll();

  return (
    <PageShell
      title="İçerik Planı"
      description="Hazır içerikler ve yayın takvimi"
    >
      <ContentTable items={items} isAdmin={isAdmin} />
    </PageShell>
  );
}
