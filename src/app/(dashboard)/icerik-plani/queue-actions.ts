'use server';

import { revalidatePath } from 'next/cache';
import { contentQueueService } from '@/services/content-queue.service';
import { userService } from '@/services';
import { notificationService } from '@/services/notification.service';
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
 * Advance an item to the next pipeline stage (hand off). Rules:
 * - Metin → Ses: Admin/Yayıncı completes the text AND picks who voices it
 *   (assigneeId, a Seslendirmen or Yayıncı). Card is assigned to that person;
 *   only they get notified.
 * - Ses → Kurgu: the ASSIGNED voice person (or Admin/Yayıncı) drops the link;
 *   assignment clears and all Editörs are notified (role-based).
 * - Kurgu → Hazır: an Editör (or Admin/Yayıncı) drops the video link.
 * - Hazır → Yayınlandı: Admin/Yayıncı only.
 * The server rebuilds the patch by stage — clients only pass the link/assignee.
 */
export async function advanceContentStage(id: string, link?: string | null, assigneeId?: string | null) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };

  const item = await contentQueueService.getByIdAdmin(id);
  if (!item) return { error: 'İçerik bulunamadı' };

  const stage = deriveStage(item);
  const isFull = ['ADMIN', 'PUBLISHER'].includes(user.role);

  // Permission by stage
  if (stage === 'METIN' && !isFull) return { error: 'Metni yalnızca Yayıncı/Admin tamamlar' };
  if (stage === 'SES' && !isFull && item.assigned_to !== user.id) return { error: 'Bu ses işini ilerletme yetkin yok' };
  if (stage === 'EDITOR' && !isFull && !(ROLE_STAGES[user.role] ?? []).includes('EDITOR')) return { error: 'Bu kurgu işini ilerletme yetkin yok' };
  if (stage === 'HAZIR' && !isFull) return { error: 'Yayına almayı yalnızca Yayıncı/Admin yapabilir' };

  const url = link && link.trim() ? link.trim() : null;
  let patch: UpdateContentQueueInput;
  if (stage === 'METIN') {
    if (!assigneeId) return { error: 'Seslendirecek kişiyi seç' };
    patch = { has_text: true, assigned_to: assigneeId };
  } else if (stage === 'SES') {
    patch = { has_voice: true, voice_url: url ?? item.voice_url, assigned_to: null };
  } else if (stage === 'EDITOR') {
    patch = { has_video: true, status: 'HAZIR', video_url: url ?? item.video_url };
  } else if (stage === 'HAZIR') {
    patch = { status: 'YAYINLANDI' };
  } else {
    return { error: 'İlerletilecek aşama yok' };
  }

  const result = await contentQueueService.updateAdmin(id, patch);
  if (result.error) return { error: result.error };

  // Notify whoever is now responsible for the new stage.
  const notifyBase = { body: item.title, url: '/icerik-plani', tag: `content-${id}`, excludeUserId: user.id };
  if (stage === 'METIN' && assigneeId) {
    await notificationService.notify({ ...notifyBase, userIds: [assigneeId], title: '🎙 Ses işin var' });
  } else if (stage === 'SES') {
    await notificationService.notify({ ...notifyBase, roles: ['EDITOR'], title: '🎬 Kurgu işin var' });
  } else if (stage === 'EDITOR') {
    await notificationService.notify({ ...notifyBase, roles: ['PUBLISHER'], title: '✅ Yayına hazır' });
  }

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
