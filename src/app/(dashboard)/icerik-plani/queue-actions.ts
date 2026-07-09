'use server';

import { revalidatePath } from 'next/cache';
import { contentQueueService } from '@/services/content-queue.service';
import { userService } from '@/services';
import { deriveStage, ROLE_STAGES } from './content-queue.constants';
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

  revalidatePath('/icerik-plani');
  return { success: true };
}

export async function updateContentItem(id: string, input: UpdateContentQueueInput) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!['ADMIN', 'PUBLISHER'].includes(user.role)) return { error: 'Yetki yok' };

  const result = await contentQueueService.update(id, input);
  if (result.error) return { error: result.error };

  revalidatePath('/icerik-plani');
  return { success: true };
}

export async function updateContentStatus(id: string, status: ContentStatus) {
  return updateContentItem(id, { status });
}

/**
 * Advance an item to the next pipeline stage (drop link + hand off). Allowed
 * for ADMIN/PUBLISHER on any stage, or the role responsible for the item's
 * CURRENT stage (Ses→Seslendirmen, Kurgu→Editör). The server rebuilds the
 * patch by stage — clients only supply the deliverable link.
 */
export async function advanceContentStage(id: string, link?: string | null) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };

  const item = await contentQueueService.getByIdAdmin(id);
  if (!item) return { error: 'İçerik bulunamadı' };

  const stage = deriveStage(item);
  const isFull = ['ADMIN', 'PUBLISHER'].includes(user.role);
  const owns = (ROLE_STAGES[user.role] ?? []).includes(stage);
  if (!isFull && !owns) return { error: 'Bu aşamayı ilerletme yetkin yok' };

  const url = link && link.trim() ? link.trim() : null;
  let patch: UpdateContentQueueInput;
  if (stage === 'METIN') patch = { has_text: true };
  else if (stage === 'SES') patch = { has_voice: true, voice_url: url ?? item.voice_url };
  else if (stage === 'EDITOR') patch = { has_video: true, status: 'HAZIR', video_url: url ?? item.video_url };
  else if (stage === 'HAZIR') {
    if (!isFull) return { error: 'Yayına almayı yalnızca Yayıncı/Admin yapabilir' };
    patch = { status: 'YAYINLANDI' };
  } else {
    return { error: 'İlerletilecek aşama yok' };
  }

  const result = await contentQueueService.updateAdmin(id, patch);
  if (result.error) return { error: result.error };

  revalidatePath('/icerik-plani');
  return { success: true };
}

export async function deleteContentItem(id: string) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!['ADMIN', 'PUBLISHER'].includes(user.role)) return { error: 'Yetki yok' };

  const result = await contentQueueService.delete(id);
  if (!result.success) return { error: result.error };

  revalidatePath('/icerik-plani');
  return { success: true };
}

export type { ContentPlatform, ContentStatus } from './content-queue.constants';
