/**
 * Work Item Validation Schemas
 */

import { z } from 'zod';

export const workItemBaseSchema = z.object({
  work_type: z.enum(['STREAM', 'VOICE', 'EDIT'], {
    message: 'Work type is required',
  }),
  work_date: z.string().min(1, 'Work date is required'),
  notes: z.string().optional(),
});

export const streamWorkItemSchema = workItemBaseSchema.extend({
  work_type: z.literal('STREAM'),
  match_name: z.string().min(1, 'Match name is required'),
  duration_minutes: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
});

export const voiceWorkItemSchema = workItemBaseSchema.extend({
  work_type: z.literal('VOICE'),
  content_name: z.string().min(1, 'Content name is required'),
  content_length: z.enum(['SHORT', 'LONG'], {
    message: 'Content length is required',
  }),
});

export const editWorkItemSchema = workItemBaseSchema.extend({
  work_type: z.literal('EDIT'),
  content_name: z.string().min(1, 'Content name is required'),
  content_length: z.enum(['SHORT', 'LONG'], {
    message: 'Content length is required',
  }),
});

export const createWorkItemSchema = z.discriminatedUnion('work_type', [
  streamWorkItemSchema,
  voiceWorkItemSchema,
  editWorkItemSchema,
]);

export type CreateWorkItemFormData = z.infer<typeof createWorkItemSchema>;
