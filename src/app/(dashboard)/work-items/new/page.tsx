/**
 * New Work Item Page
 * Form for creating new work entries.
 * `?plan=<id>` ile gelinirse (yayıncının "Yayını gir"i) form planın maç,
 * tarih ve müşteri bilgileriyle önceden dolu açılır; kaydedince plan kapanır.
 */

import { FileText as PageIcon } from 'lucide-react';
import { PageShell } from '@/components/layout';
import { tr } from '@/lib/i18n';
import { userService } from '@/services';
import { clientService } from '@/services/client.service';
import { contentPlanService } from '@/services/content-plan.service';
import { WorkItemForm, type WorkItemPrefill } from './work-item-form';

export const dynamic = 'force-dynamic';

export default async function NewWorkItemPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  const [clients, currentUser] = await Promise.all([clientService.getAll(), userService.getCurrentUser()]);

  // Sadece kişinin KENDİ açık planı ön doldurma kaynağı olabilir (RLS de bunu sağlar).
  let prefill: WorkItemPrefill | undefined;
  if (planId && currentUser) {
    const plan = await contentPlanService.getById(planId);
    if (plan && plan.assigned_to === currentUser.id && plan.status !== 'DONE' && plan.status !== 'CANCELLED') {
      prefill = {
        planId: plan.id,
        work_type: plan.content_type,
        title: plan.title,
        work_date: plan.planned_date,
        client_id: plan.client_id,
      };
    }
  }

  return (
    <PageShell
      icon={PageIcon}
      title={prefill ? 'Yayını gir' : tr.work.addItem}
      description={prefill ? `Planlı yayın: ${prefill.title}` : tr.work.createItem}
    >
      <div className="mx-auto max-w-2xl">
        <WorkItemForm clients={clients} prefill={prefill} />
      </div>
    </PageShell>
  );
}
