/**
 * New Work Item Page
 * Form for creating new work entries
 */

import { PageShell } from '@/components/layout';
import { WorkItemForm } from './work-item-form';

export default function NewWorkItemPage() {
  return (
    <PageShell title="Add Work Item" description="Create a new work entry">
      <div className="mx-auto max-w-2xl">
        <WorkItemForm />
      </div>
    </PageShell>
  );
}
