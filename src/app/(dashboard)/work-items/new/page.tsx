/**
 * New Work Item Page
 * Form for creating new work entries
 */

import { PageShell } from '@/components/layout';
import { tr } from '@/lib/i18n';
import { WorkItemForm } from './work-item-form';

export default function NewWorkItemPage() {
  return (
    <PageShell title={tr.work.addItem} description={tr.work.createItem}>
      <div className="mx-auto max-w-2xl">
        <WorkItemForm />
      </div>
    </PageShell>
  );
}
