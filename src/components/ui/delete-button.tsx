'use client';

/**
 * Delete Button Component
 * Trash icon with confirm dialog for admin delete actions
 */

import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { ConfirmDialog } from './confirm-dialog';

interface DeleteButtonProps {
  onDelete: () => Promise<{ success: boolean; error?: string }>;
  description?: string;
  className?: string;
}

export function DeleteButton({
  onDelete,
  description = tr.confirm.deleteDescription,
  className,
}: DeleteButtonProps) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center',
            'h-8 w-8 rounded-md',
            'text-[var(--color-text-muted)]',
            'hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]',
            'transition-colors',
            className
          )}
          title={tr.actions.delete}
        >
          {/* Trash Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      }
      description={description}
      onConfirm={onDelete}
    />
  );
}
