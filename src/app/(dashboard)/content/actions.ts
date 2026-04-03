'use server';

/**
 * Content Plan Server Actions
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { contentPlanService, userService } from '@/services';
import type { ContentPlanStatus } from '@/types';

const createSchema = z.object({
  title: z.string().min(1, 'Başlık zorunlu'),
  content_type: z.enum(['VOICE', 'EDIT', 'STREAM']),
  planned_date: z.string().min(1, 'Tarih zorunlu'),
  assigned_to: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  notes: z.string().optional().nullable(),
  platform: z.enum(['YOUTUBE', 'INSTAGRAM', 'X']).optional().nullable(),
  content_subtype: z.enum(['VIDEO', 'SHORTS', 'REELS', 'POST']).optional().nullable(),
});

export async function createContentPlan(formData: FormData) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return { error: 'Yetkisiz işlem' };
  }

  const raw = {
    title: formData.get('title'),
    content_type: formData.get('content_type'),
    planned_date: formData.get('planned_date'),
    assigned_to: formData.get('assigned_to') || null,
    priority: formData.get('priority') || 'NORMAL',
    notes: formData.get('notes') || null,
    platform: formData.get('platform') || null,
    content_subtype: formData.get('content_subtype') || null,
  };

  const result = createSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const plan = await contentPlanService.create(result.data, currentUser.id);
  if (!plan) return { error: 'Plan oluşturulamadı' };

  revalidatePath('/content');
  return { success: true };
}

export async function updateContentPlanStatus(id: string, status: ContentPlanStatus) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) return { error: 'Yetkisiz işlem' };

  const ok = await contentPlanService.updateStatus(id, status);
  if (!ok) return { error: 'Güncellenemedi' };

  revalidatePath('/content');
  return { success: true };
}

export async function deleteContentPlan(id: string) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return { error: 'Yetkisiz işlem' };
  }

  const ok = await contentPlanService.delete(id);
  if (!ok) return { error: 'Silinemedi' };

  revalidatePath('/content');
  return { success: true };
}
