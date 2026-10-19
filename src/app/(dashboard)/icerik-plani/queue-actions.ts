'use server';

import { revalidatePath } from 'next/cache';
import { contentQueueService } from '@/services/content-queue.service';
import { userService, workItemService } from '@/services';
import { notificationService } from '@/services/notification.service';
import { publicationMetricsService } from '@/services/publication-metrics.service';
import {
  deriveStage,
  decideHandoff,
  voiceRequestNotification,
  ROLE_STAGES,
  CONTENT_EDITOR_ROLES,
} from './content-queue.constants';
import type { PublicationInput } from './content-queue.constants';
import type {
  ContentStatus,
  CreateContentQueueInput,
  UpdateContentQueueInput,
} from './content-queue.constants';


export async function createContentItem(input: Omit<CreateContentQueueInput, 'created_by'>) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!(CONTENT_EDITOR_ROLES as readonly string[]).includes(user.role)) return { error: 'Yetki yok' };

  // "Metni yaz, seçtiğin kişiye gitsin": karar saf katmanda, burada yalnızca
  // uygulanır. Kişi + metin varsa kart Ses adımında açılır (has_text=true).
  const handoff = decideHandoff({
    text: input.content_text,
    assigneeId: input.assigned_to,
    hasTextChecked: input.has_text,
  });
  if (handoff.blocked === 'NO_TEXT') {
    return { error: 'Seslendirmeye göndermek için metni de yaz' };
  }

  const result = await contentQueueService.create({
    ...input,
    has_text: handoff.hasText,
    assigned_to: handoff.assignedTo,
    created_by: user.id,
  });
  if (result.error) return { error: result.error };

  if (handoff.notify && handoff.assignedTo) {
    await notificationService.notify({
      ...voiceRequestNotification(input.title),
      userIds: [handoff.assignedTo],
      url: '/icerik-plani',
      tag: `content-${result.item?.id ?? 'new'}`,
      excludeUserId: user.id,
    });
  }

  revalidatePath('/icerik-plani');
  return { success: true, sent: handoff.notify };
}

export async function updateContentItem(id: string, input: UpdateContentQueueInput) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!(CONTENT_EDITOR_ROLES as readonly string[]).includes(user.role)) return { error: 'Yetki yok' };

  // Seslendiren değiştiyse yeni kişiye haber ver — formdan değiştirip
  // "neden haberi olmadı" durumuna düşmeyelim. Aynı kişiyse bildirim yok.
  const before = input.assigned_to !== undefined ? await contentQueueService.getByIdAdmin(id) : null;

  const result = await contentQueueService.update(id, input);
  if (result.error) return { error: result.error };

  const newAssignee = input.assigned_to ?? null;
  const changed = before && newAssignee && newAssignee !== before.assigned_to;
  const hasBody = Boolean((input.content_text ?? before?.content_text ?? '').trim());
  if (changed && hasBody) {
    await notificationService.notify({
      ...voiceRequestNotification(input.title ?? before.title),
      userIds: [newAssignee],
      url: '/icerik-plani',
      tag: `content-${id}`,
      excludeUserId: user.id,
    });
  }

  revalidatePath('/icerik-plani');
  return { success: true };
}

export async function updateContentStatus(id: string, status: ContentStatus) {
  return updateContentItem(id, { status });
}

/**
 * Assign (or reassign) who voices a card. Content editors only. Notifies the
 * chosen person. Also fixes older cards that reached "Ses" before assignees.
 */
export async function assignContentPerson(id: string, assigneeId: string | null) {
  const user = await userService.getCurrentUser();
  if (!user || !(CONTENT_EDITOR_ROLES as readonly string[]).includes(user.role)) return { error: 'Yetki yok' };

  const item = await contentQueueService.getByIdAdmin(id);
  if (!item) return { error: 'İçerik bulunamadı' };

  const result = await contentQueueService.updateAdmin(id, { assigned_to: assigneeId });
  if (result.error) return { error: result.error };

  if (assigneeId) {
    await notificationService.notify({
      ...voiceRequestNotification(item.title),
      userIds: [assigneeId],
      url: '/icerik-plani',
      tag: `content-${id}`,
      excludeUserId: user.id,
    });
  }
  revalidatePath('/icerik-plani');
  return { success: true };
}

/**
 * Publishing a card: record which platforms it went out on (YouTube/Instagram
 * resolve their metrics live; TikTok/X/Twitch carry hand-typed numbers), flip
 * it to YAYINLANDI, and open the voice/edit work items for billing.
 */
export async function publishContent(id: string, publications: PublicationInput[]) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!(CONTENT_EDITOR_ROLES as readonly string[]).includes(user.role)) return { error: 'Yetki yok' };

  const item = await contentQueueService.getByIdAdmin(id);
  if (!item) return { error: 'İçerik bulunamadı' };
  if (deriveStage(item) !== 'HAZIR') return { error: 'Yalnızca "Hazır" içerik yayınlanabilir' };

  const saved = await contentQueueService.savePublications(id, publications);
  if (saved.error) return { error: saved.error };

  // Auto-add to the content library: put the card's script on the published
  // video/post so it shows in İçerik Performansı without a manual re-paste.
  await contentQueueService.linkScriptToContent(publications, item.content_text);

  // Yayın anındaki elle girilmiş sayılar (varsa) geçmişin başlangıç noktası olur.
  await publicationMetricsService.recordManualEntry(id).catch(() => null);

  const result = await contentQueueService.updateAdmin(id, { status: 'YAYINLANDI' });
  if (result.error) return { error: result.error };

  // Voice + edit jobs land in İş Takibi as DRAFT (admin prices or deletes them).
  const today = new Date().toISOString().slice(0, 10);
  if (item.voiced_by) {
    await workItemService.createDraft({
      user_id: item.voiced_by, work_type: 'VOICE', content_name: item.title, work_date: today,
      notes: `İçerik Planı — seslendirme: ${item.title}`,
    });
  }
  if (item.edited_by) {
    await workItemService.createDraft({
      user_id: item.edited_by, work_type: 'EDIT', content_name: item.title, work_date: today,
      notes: `İçerik Planı — kurgu: ${item.title}`,
    });
  }

  revalidatePath('/icerik-plani');
  revalidatePath('/work-items');
  revalidatePath('/fikir-havuzu');
  // Yayın kayıtları İçerik Bazlı performansın kaynağı — o sayfa da tazelenmeli.
  revalidatePath('/icerik-performansi');
  return { success: true };
}

/**
 * Edit a published card's platform records — fix a link, attach one that was
 * missed, or refresh the hand-entered TikTok/X numbers (those never auto-update).
 */
export async function updatePublications(id: string, publications: PublicationInput[]) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!(CONTENT_EDITOR_ROLES as readonly string[]).includes(user.role)) return { error: 'Yetki yok' };

  const item = await contentQueueService.getByIdAdmin(id);
  if (!item) return { error: 'İçerik bulunamadı' };

  const saved = await contentQueueService.savePublications(id, publications);
  if (saved.error) return { error: saved.error };

  // Keep the library link current if a platform link was fixed/added.
  await contentQueueService.linkScriptToContent(publications, item.content_text);

  // TikTok/X/Twitch sayılarının API karşılığı yok — geçmişin tek kaynağı bu
  // giriş anı. Ölçüm noktası penceresindeyse o noktaya da bağlanır.
  await publicationMetricsService.recordManualEntry(id).catch(() => null);

  revalidatePath('/icerik-plani');
  revalidatePath('/fikir-havuzu');
  revalidatePath('/icerik-performansi');
  return { success: true };
}

/**
 * Advance an item to the next pipeline stage (hand off). Rules:
 * - Metin → Ses: Admin/Yayıncı/Youtuber completes the text AND picks who voices it
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
  const isFull = (CONTENT_EDITOR_ROLES as readonly string[]).includes(user.role);

  // Permission by stage
  if (stage === 'METIN' && !isFull) return { error: 'Metni yalnızca Yayıncı/Youtuber/Admin tamamlar' };
  if (stage === 'SES' && !isFull && item.assigned_to !== user.id) return { error: 'Bu ses işini ilerletme yetkin yok' };
  if (stage === 'EDITOR' && !isFull && !(ROLE_STAGES[user.role] ?? []).includes('EDITOR')) return { error: 'Bu kurgu işini ilerletme yetkin yok' };
  if (stage === 'HAZIR' && !isFull) return { error: 'Yayına almayı yalnızca Yayıncı/Admin yapabilir' };

  const url = link && link.trim() ? link.trim() : null;
  let patch: UpdateContentQueueInput;
  if (stage === 'METIN') {
    if (!assigneeId) return { error: 'Seslendirecek kişiyi seç' };
    patch = { has_text: true, assigned_to: assigneeId };
  } else if (stage === 'SES') {
    // Record who voiced it (the assigned person) for later billing.
    patch = { has_voice: true, voice_url: url ?? item.voice_url, assigned_to: null, voiced_by: item.assigned_to ?? user.id };
  } else if (stage === 'EDITOR') {
    // Whoever handed off the edit is the editor.
    patch = { has_video: true, status: 'HAZIR', video_url: url ?? item.video_url, edited_by: user.id };
  } else if (stage === 'HAZIR') {
    return { error: 'Yayınlamak için "Yayınla" butonunu kullan' };
  } else {
    return { error: 'İlerletilecek aşama yok' };
  }

  const result = await contentQueueService.updateAdmin(id, patch);
  if (result.error) return { error: result.error };

  // Notify whoever is now responsible for the new stage — say what to do next.
  const notifyBase = { url: '/icerik-plani', tag: `content-${id}`, excludeUserId: user.id };
  if (stage === 'METIN' && assigneeId) {
    await notificationService.notify({
      ...notifyBase,
      ...voiceRequestNotification(item.title),
      userIds: [assigneeId],
    });
  } else if (stage === 'SES') {
    await notificationService.notify({
      ...notifyBase,
      roles: ['EDITOR'],
      title: '🎬 Kurgu senden bekleniyor',
      body: `Metin ve ses hazır. "${item.title}" için her şey hazır, kurguya başlayabilirsin.`,
    });
  } else if (stage === 'EDITOR') {
    // Video ready to publish → only the admin is notified.
    await notificationService.notify({
      ...notifyBase,
      roles: ['ADMIN'],
      title: '✅ Yayına hazır',
      body: `"${item.title}" videosu hazır — yayınlanmayı bekliyor.`,
    });
  }

  revalidatePath('/icerik-plani');
  return { success: true };
}

export async function deleteContentItem(id: string) {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!(CONTENT_EDITOR_ROLES as readonly string[]).includes(user.role)) return { error: 'Yetki yok' };

  const result = await contentQueueService.delete(id);
  if (!result.success) return { error: result.error };

  revalidatePath('/icerik-plani');
  return { success: true };
}

export type { ContentPlatform, ContentStatus } from './content-queue.constants';
