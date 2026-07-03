'use server';

import { revalidatePath } from 'next/cache';
import { contentQueueService } from '@/services/content-queue.service';
import { userService } from '@/services';
import type {
  ContentPlatform,
  ContentStatus,
  CreateContentQueueInput,
  UpdateContentQueueInput,
} from './content-queue.constants';


export async function createContentItem(input: Omit<CreateContentQueueInput, 'created_by'>) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!['ADMIN', 'PUBLISHER'].includes(user.role)) return { error: 'Yetki yok' };

  const result = await contentQueueService.create({ ...input, created_by: user.id });
  if (result.error) return { error: result.error };

  revalidatePath('/sosyal-medya');
  return { success: true };
}

export async function updateContentItem(id: string, input: UpdateContentQueueInput) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!['ADMIN', 'PUBLISHER'].includes(user.role)) return { error: 'Yetki yok' };

  const result = await contentQueueService.update(id, input);
  if (result.error) return { error: result.error };

  revalidatePath('/sosyal-medya');
  return { success: true };
}

export async function updateContentStatus(id: string, status: ContentStatus) {
  return updateContentItem(id, { status });
}

export async function deleteContentItem(id: string) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!['ADMIN', 'PUBLISHER'].includes(user.role)) return { error: 'Yetki yok' };

  const result = await contentQueueService.delete(id);
  if (!result.success) return { error: result.error };

  revalidatePath('/sosyal-medya');
  return { success: true };
}

export type { ContentPlatform, ContentStatus } from './content-queue.constants';
