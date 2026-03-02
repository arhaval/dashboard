/**
 * Work Item Validation Schemas
 */

import { z } from 'zod';
import { WORK_TYPES, CONTENT_LENGTHS } from '@/constants';

export const workItemBaseSchema = z.object({
  work_type: z.enum(WORK_TYPES as unknown as [string, ...string[]], {
    message: 'İş türü gereklidir',
  }),
  work_date: z.string().min(1, 'İş tarihi gereklidir'),
  notes: z.string().optional(),
});

export const streamWorkItemSchema = workItemBaseSchema.extend({
  work_type: z.literal('STREAM'),
  match_name: z.string().min(1, 'Maç adı gereklidir'),
  duration_minutes: z.coerce.number().min(1, 'Süre en az 1 dakika olmalıdır'),
});

export const voiceWorkItemSchema = workItemBaseSchema.extend({
  work_type: z.literal('VOICE'),
  content_name: z.string().min(1, 'İçerik adı gereklidir'),
  content_length: z.enum(CONTENT_LENGTHS as unknown as [string, ...string[]], {
    message: 'İçerik uzunluğu gereklidir',
  }),
});

export const editWorkItemSchema = workItemBaseSchema.extend({
  work_type: z.literal('EDIT'),
  content_name: z.string().min(1, 'İçerik adı gereklidir'),
  content_length: z.enum(CONTENT_LENGTHS as unknown as [string, ...string[]], {
    message: 'İçerik uzunluğu gereklidir',
  }),
});

export const createWorkItemSchema = z.discriminatedUnion('work_type', [
  streamWorkItemSchema,
  voiceWorkItemSchema,
  editWorkItemSchema,
]);

export type CreateWorkItemFormData = z.infer<typeof createWorkItemSchema>;
