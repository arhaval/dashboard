/**
 * Payment Actions Component
 * Minimal client component for payment row actions
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { markPaymentAsPaid, cancelPayment } from './actions';
import type { PaymentStatus } from '@/types';

interface PaymentActionsProps {
  paymentId: string;
  status: PaymentStatus;
}

export function PaymentActions({ paymentId, status }: PaymentActionsProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (status !== 'PENDING') {
    return <span className="text-sm text-[var(--color-text-muted)]">—</span>;
  }

  const handleMarkPaid = async () => {
    setIsPending(true);
    setError(null);

    const result = await markPaymentAsPaid(paymentId);

    setIsPending(false);

    if (!result.success) {
      setError(result.error || 'Failed to mark as paid');
    }
  };

  const handleCancel = async () => {
    setIsPending(true);
    setError(null);

    const result = await cancelPayment(paymentId);

    setIsPending(false);

    if (!result.success) {
      setError(result.error || 'Failed to cancel');
    }
  };

  const buttonBaseStyles = cn(
    'inline-flex items-center justify-center',
    'h-7 rounded-[var(--radius-sm)] px-2',
    'text-xs font-medium',
    'transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  return (
    <div className="relative flex items-center justify-end gap-2">
      <button
        onClick={handleMarkPaid}
        disabled={isPending}
        className={cn(
          buttonBaseStyles,
          'bg-[var(--color-success-muted)] text-[var(--color-success)]',
          'hover:bg-[var(--color-success)] hover:text-white'
        )}
      >
        {isPending ? '...' : 'Pay'}
      </button>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className={cn(
          buttonBaseStyles,
          'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-error-muted)] hover:text-[var(--color-error)]'
        )}
      >
        Cancel
      </button>
      {error && (
        <span className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-[var(--color-error)]">
          {error}
        </span>
      )}
    </div>
  );
}
