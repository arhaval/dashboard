import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { contentQueueService } from '@/services/content-queue.service';
import { ROLE_STAGES } from './content-queue.constants';
import { ContentPlanner } from './content-planner';

export const dynamic = 'force-dynamic';

export default async function IcerikPlaniPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  // Page access is enforced centrally (role → page matrix). Editing (add/
  // advance/delete) stays limited to ADMIN + PUBLISHER; others view read-only.
  const canEdit = ['ADMIN', 'PUBLISHER'].includes(currentUser.role);
  // Stages this role can hand off (advance) without full edit — Ses→Seslendirmen,
  // Kurgu→Editör. Lets each person drop their deliverable link + advance.
  const handoffStages = ROLE_STAGES[currentUser.role] ?? [];

  const [items, voiceRows] = await Promise.all([
    contentQueueService.getAll(),
    userService.getByRoles(['VOICE', 'PUBLISHER']),
  ]);
  const voicePeople = voiceRows.map((u) => ({ id: u.id, name: u.full_name }));

  const desc = canEdit
    ? 'Hazır içerikler ve yayın takvimi'
    : handoffStages.length > 0
      ? 'Yayın planı — kendi aşamandaki işleri teslim et'
      : 'Yayın planını görüntüle';

  return (
    <PageShell title="İçerik Planı" description={desc}>
      <ContentPlanner items={items} canEdit={canEdit} handoffStages={handoffStages} voicePeople={voicePeople} />
    </PageShell>
  );
}
