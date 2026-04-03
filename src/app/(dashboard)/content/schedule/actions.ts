'use server';

import { revalidatePath } from 'next/cache';
import { weeklyScheduleService, userService } from '@/services';
import type { WeekActivity } from '@/services/weekly-schedule.service';

export async function updateDaySchedule(
  dayOfWeek: number,
  activities: WeekActivity[],
  notes?: string
) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return { error: 'Yetkisiz işlem' };
  }
  const ok = await weeklyScheduleService.updateDay(dayOfWeek, activities, notes);
  if (!ok) return { error: 'Güncellenemedi' };
  revalidatePath('/content/schedule');
  return { success: true };
}
