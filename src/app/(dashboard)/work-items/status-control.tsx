/**
 * Status Control Component
 * Minimal client component for updating work item status
 * Admin-only, server action based
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { updateWorkItemStatus } from './actions';
import type { WorkStatus } from '@/types';

interface StatusControlProps {
  workItemId: string;
  currentStatus: WorkStatus;
  isAdmin: boolean;
  isOwnItem: boolean;
}

const statusOptions: { value: WorkStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
];

function getStatusStyles(status: WorkStatus) {
  switch (status) {
    case 'DRAFT':
      return 'bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]';
    case 'APPROVED':
      return 'bg-[var(--color-info-muted)] text-[var(--color-info)] border-[var(--color-info)]';
    case 'PAID':
      return 'bg-[var(--color-success-muted)] text-[var(--color-success)] border-[var(--color-success)]';
  }
}

function getNextStatus(current: WorkStatus): WorkStatus | null {
  switch (current) {
    case 'DRAFT':
      return 'APPROVED';
    case 'APPROVED':
      return 'PAID';
    case 'PAID':
      return null;
  }
}

export function StatusControl({
  workItemId,
  currentStatus,
  isAdmin,
  isOwnItem,
}: StatusControlProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const nextStatus = getNextStatus(currentStatus);
  const canChange = isAdmin && !isOwnItem && nextStatus !== null;

  const handleStatusChange = async () => {
    if (!canChange || !nextStatus) return;

    setIsPending(true);
    setError(null);

    const result = await updateWorkItemStatus(workItemId, nextStatus);

    setIsPending(false);

    if (!result.success) {
      setError(result.error || 'Update failed');
    }
  };

  // Non-admin or own item: show static badge
  if (!canChange) {
    return (
      <span
        className={cn(
          'inline-block rounded-full px-2 py-0.5',
          'text-xs font-medium',
          getStatusStyles(currentStatus)
        )}
      >
        {currentStatus}
      </span>
    );
  }

  // Admin with changeable status: show clickable badge
  return (
    <div className="relative">
      <button
        onClick={handleStatusChange}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
          'text-xs font-medium',
          'border',
          'transition-all hover:opacity-80',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          getStatusStyles(currentStatus)
        )}
        title={`Click to change to ${nextStatus}`}
      >
        {isPending ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          currentStatus
        )}
        {!isPending && <span className="text-[10px]">→</span>}
      </button>
      {error && (
        <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-[var(--color-error)]">
          {error}
        </span>
      )}
    </div>
  );
}
