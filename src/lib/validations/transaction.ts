/**
 * Transaction (Finance) Validation Schemas
 */

import { z } from 'zod';
import { TRANSACTION_TYPES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants';

const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as const;

export const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES as unknown as [string, ...string[]], {
    message: 'İşlem türü gereklidir',
  }),
  category: z.enum(allCategories as unknown as [string, ...string[]], {
    message: 'Kategori gereklidir',
  }),
  amount: z.coerce.number().positive('Tutar 0\'dan büyük olmalıdır'),
  description: z.string().optional(),
  transaction_date: z.string().min(1, 'Tarih gereklidir'),
  user_id: z.string().uuid().optional().or(z.literal('')),
});

export type CreateTransactionFormData = z.infer<typeof createTransactionSchema>;
