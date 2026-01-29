'use client';

/**
 * Payment Delete Button
 * Admin-only delete with confirmation
 */

import { DeleteButton } from '@/components/ui/delete-button';
import { deletePayment } from '../admin-actions';
import { tr } from '@/lib/i18n';

interface PaymentDeleteButtonProps {
  paymentId: string;
}

export function PaymentDeleteButton({ paymentId }: PaymentDeleteButtonProps) {
  return (
    <DeleteButton
      onDelete={() => deletePayment(paymentId)}
      description={tr.confirm.deletePayment}
    />
  );
}
