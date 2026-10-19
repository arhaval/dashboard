'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { dailyNoteService } from '@/services/daily-note.service';

/** YYYY-MM-DD — adres çubuğundan ya da istemciden gelen tarihi doğrular. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function saveDailyNote(
  noteDate: string,
  body: string
): Promise<{ error?: string; savedAt?: string }> {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (!DATE_PATTERN.test(noteDate)) return { error: 'Geçersiz tarih' };

  const res = await dailyNoteService.save(user.id, noteDate, body);
  if (res.error) return { error: res.error };

  revalidatePath('/gunluk');
  return { savedAt: new Date().toISOString() };
}
