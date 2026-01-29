'use client';

/**
 * Confirm Dialog Component
 * Simple modal for delete confirmations
 */

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
}

export function ConfirmDialog({
  trigger,
  title = tr.confirm.deleteTitle,
  description = tr.confirm.deleteDescription,
  confirmText = tr.confirm.yes,
  cancelText = tr.confirm.no,
  onConfirm,
  onSuccess,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result.success) {
        setIsOpen(false);
        onSuccess?.();
      } else {
        setError(result.error || tr.messages.error.generic);
      }
    });
  };

  return (
    <>
      {/* Trigger */}
      <div onClick={() => setIsOpen(true)}>{trigger}</div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !isPending && setIsOpen(false)}
          />

          {/* Dialog */}
          <div
            className={cn(
              'relative z-10 w-full max-w-sm',
              'rounded-lg border border-[var(--color-border)]',
              'bg-[var(--color-bg-secondary)] p-6',
              'shadow-lg'
            )}
          >
            {/* Title */}
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {title}
            </h3>

            {/* Description */}
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {description}
            </p>

            {/* Error */}
            {error && (
              <p className="mt-3 text-sm text-[var(--color-error)]">{error}</p>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  'border border-[var(--color-border)]',
                  'text-[var(--color-text-secondary)]',
                  'hover:bg-[var(--color-bg-tertiary)]',
                  'transition-colors',
                  'disabled:opacity-50'
                )}
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  'bg-[var(--color-error)] text-white',
                  'hover:bg-[var(--color-error)]/90',
                  'transition-colors',
                  'disabled:opacity-50'
                )}
              >
                {isPending ? 'Siliniyor...' : confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
