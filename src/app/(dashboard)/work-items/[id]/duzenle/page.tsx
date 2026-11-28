/**
 * İş kaydını düzenle — yalnızca kaydın sahibi (veya admin) ve kayıt hâlâ
 * TASLAK iken. Onaylanan iş kilitlidir. Ücret yeniden sunucuda çözülür.
 */

import { Pencil as PageIcon } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService, workItemService } from '@/services';
import { clientService } from '@/services/client.service';
import { WorkItemForm, type WorkItemFormValues } from '../../new/work-item-form';

export const dynamic = 'force-dynamic';

export default async function EditWorkItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [currentUser, item, clients] = await Promise.all([
    userService.getCurrentUser(),
    workItemService.getById(id),
    clientService.getAll(),
  ]);

  if (!currentUser) redirect('/login');
  if (!item) notFound();

  const canEdit =
    item.status === 'DRAFT' && (item.user_id === currentUser.id || currentUser.role === 'ADMIN');
  if (!canEdit) redirect('/work-items');

  const values: WorkItemFormValues = {
    work_type: item.work_type,
    work_date: item.work_date,
    notes: item.notes ?? '',
    client_id: item.client_id ?? '',
    match_name: item.match_name ?? '',
    duration_minutes: item.duration_minutes ? String(item.duration_minutes) : '',
    map_count: item.map_count ? String(item.map_count) : '',
    content_name: item.content_name ?? '',
    content_length: item.content_length ?? '',
  };

  return (
    <PageShell
      icon={PageIcon}
      title="İşi düzenle"
      description="Onaylanana kadar bilgileri düzeltebilirsin. Ücret yeniden hesaplanır."
    >
      <div className="mx-auto max-w-2xl">
        <WorkItemForm clients={clients} edit={{ id: item.id, values }} />
      </div>
    </PageShell>
  );
}
