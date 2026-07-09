import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { contentQueueService } from '@/services/content-queue.service';
import { ContentPlanner } from './content-planner';

export const dynamic = 'force-dynamic';

export default async function IcerikPlaniPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  // Page access is enforced centrally (role → page matrix). Editing (add/
  // advance/delete) stays limited to ADMIN + PUBLISHER; others view read-only.
  const canEdit = ['ADMIN', 'PUBLISHER'].includes(currentUser.role);

  const items = await contentQueueService.getAll();

  return (
    <PageShell
      title="İçerik Planı"
      description={canEdit ? 'Hazır içerikler ve yayın takvimi' : 'Yayın planını görüntüle'}
    >
      <ContentPlanner items={items} canEdit={canEdit} />
    </PageShell>
  );
}
