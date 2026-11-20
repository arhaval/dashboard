/**
 * New Work Item Page
 * Form for creating new work entries
 */

import { PageShell } from '@/components/layout';
import { tr } from '@/lib/i18n';
import { clientService } from '@/services/client.service';
import { WorkItemForm } from './work-item-form';

export const dynamic = 'force-dynamic';

export default async function NewWorkItemPage() {
  const clients = await clientService.getAll();

  return (
    <PageShell title={tr.work.addItem} description={tr.work.createItem}>
      <div className="mx-auto max-w-2xl">
        <WorkItemForm clients={clients} />
      </div>
    </PageShell>
  );
}
