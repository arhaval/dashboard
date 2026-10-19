import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { contentQueueService } from '@/services/content-queue.service';
import { ROLE_STAGES, CONTENT_EDITOR_ROLES } from './content-queue.constants';
import { ContentTable } from './content-table';

export const dynamic = 'force-dynamic';

export default async function IcerikPlaniPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  // Page access is enforced centrally (role → page matrix). Editing (add/
  // advance/delete) stays limited to ADMIN + PUBLISHER + YOUTUBER; others view read-only.
  const canEdit = (CONTENT_EDITOR_ROLES as readonly string[]).includes(currentUser.role);
  // Stages this role can hand off (advance) without full edit — Ses→Seslendirmen,
  // Kurgu→Editör. Lets each person drop their deliverable link + advance.
  const handoffStages = ROLE_STAGES[currentUser.role] ?? [];

  const [items, voiceRows] = await Promise.all([
    contentQueueService.getAll(),
    userService.getByRoles(['VOICE', 'PUBLISHER']),
  ]);
  const voicePeople = voiceRows.map((u) => ({ id: u.id, name: u.full_name }));

  const desc = canEdit
    ? 'Hangi iş kimde, hangi adımda ve ne kadar bekliyor'
    : handoffStages.length > 0
      ? 'Kendi aşamandaki işleri teslim et'
      : 'İçerik takibini görüntüle';

  return (
    <PageShell title="İçerik Takip" description={desc}>
      <ContentTable
        items={items}
        canEdit={canEdit}
        handoffStages={handoffStages}
        voicePeople={voicePeople}
      />
    </PageShell>
  );
}
