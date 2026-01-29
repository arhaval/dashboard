'use client';

/**
 * Transaction Delete Button
 * Admin-only delete with confirmation
 */

import { DeleteButton } from '@/components/ui/delete-button';
import { deleteTransaction } from '../admin-actions';
import { tr } from '@/lib/i18n';

interface TransactionDeleteButtonProps {
  transactionId: string;
}

export function TransactionDeleteButton({ transactionId }: TransactionDeleteButtonProps) {
  return (
    <DeleteButton
      onDelete={() => deleteTransaction(transactionId)}
      description={tr.confirm.deleteTransaction}
    />
  );
}
