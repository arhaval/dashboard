'use client';

/**
 * Work Item Delete Button
 * Admin-only delete with confirmation
 */

import { DeleteButton } from '@/components/ui/delete-button';
import { deleteWorkItem } from '../admin-actions';
import { tr } from '@/lib/i18n';

interface WorkItemDeleteButtonProps {
  workItemId: string;
}

export function WorkItemDeleteButton({ workItemId }: WorkItemDeleteButtonProps) {
  return (
    <DeleteButton
      onDelete={() => deleteWorkItem(workItemId)}
      description={tr.confirm.deleteWorkItem}
    />
  );
}
