/**
 * Payment Validation Schemas
 */

import { z } from 'zod';

export const createPaymentSchema = z.object({
  user_id: z.string().uuid('Geçerli bir kullanıcı seçin'),
  work_item_ids: z.array(z.string().uuid()).min(1, 'En az bir iş kalemi seçilmelidir'),
  notes: z.string().optional(),
});

export type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;
