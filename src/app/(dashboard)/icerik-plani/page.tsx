import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { contentQueueService } from '@/services/content-queue.service';
import { ROLE_STAGES, CONTENT_EDITOR_ROLES, type PublicationInput } from './content-queue.constants';
import { ContentPlanner } from './content-planner';

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

  // Published cards carry platform records; the kanban lets editors fix links
  // and refresh the hand-entered TikTok/X numbers.
  const publishedIds = items.filter((i) => i.status === 'YAYINLANDI').map((i) => i.id);
  const pubRows = await contentQueueService.getPublicationsForCards(publishedIds);
  const publicationsByCard: Record<string, PublicationInput[]> = {};
  for (const r of pubRows) {
    (publicationsByCard[r.content_queue_id] ??= []).push({
      platform: r.platform, url: r.url, external_id: r.external_id, views: r.views, likes: r.likes,
    });
  }

  const desc = canEdit
    ? 'Hazır içerikler ve yayın takvimi'
    : handoffStages.length > 0
      ? 'Yayın planı — kendi aşamandaki işleri teslim et'
      : 'Yayın planını görüntüle';

  return (
    <PageShell title="İçerik Planı" description={desc}>
      <ContentPlanner items={items} canEdit={canEdit} handoffStages={handoffStages} voicePeople={voicePeople} publicationsByCard={publicationsByCard} />
    </PageShell>
  );
}
