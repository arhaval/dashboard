/**
 * Create Payment Button Component
 * Minimal client component for creating payment from work item
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { createPaymentFromWorkItems } from '@/app/(dashboard)/payments/actions';

interface CreatePaymentButtonProps {
  workItemId: string;
  userId: string;
}

export function CreatePaymentButton({ workItemId, userId }: CreatePaymentButtonProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleClick = async () => {
    setIsPending(true);
    setError(null);

    const result = await createPaymentFromWorkItems(userId, [workItemId]);

    setIsPending(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Ödeme oluşturulamadı');
    }
  };

  if (success) {
    return (
      <span className={[
        'inline-block rounded-full px-2 py-0.5',
        'text-xs font-medium',
        'bg-[var(--color-warning-muted)] text-[var(--color-warning)]'
      ].join(' ')}>
        Ödeme Bekliyor
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          'inline-flex items-center justify-center',
          'h-7 rounded-[var(--radius-sm)] px-2',
          'text-xs font-medium',
          'bg-[var(--color-accent-muted)] text-[var(--color-accent)]',
          'hover:bg-[var(--color-accent)] hover:text-white',
          'transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isPending ? '...' : 'Ödeme Oluştur'}
      </button>
      {error && (
        <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-[var(--color-error)]">
          {error}
        </span>
      )}
    </div>
  );
}
