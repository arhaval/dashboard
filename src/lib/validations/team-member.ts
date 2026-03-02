/**
 * Team Member Validation Schemas
 */

import { z } from 'zod';
import { USER_ROLES } from '@/constants';

export const createTeamMemberSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  full_name: z.string().min(1, 'Ad soyad gereklidir'),
  role: z.enum(USER_ROLES as unknown as [string, ...string[]], {
    message: 'Geçerli bir rol seçin',
  }),
});

export const updateTeamMemberSchema = z.object({
  full_name: z.string().min(1, 'Ad soyad boş olamaz').optional(),
  role: z.enum(USER_ROLES as unknown as [string, ...string[]]).optional(),
  phone: z.string().optional().or(z.literal('')),
  iban: z.string().optional().or(z.literal('')),
  bank_name: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type CreateTeamMemberFormData = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberFormData = z.infer<typeof updateTeamMemberSchema>;
