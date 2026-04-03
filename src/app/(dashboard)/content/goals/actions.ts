'use server';

import { revalidatePath } from 'next/cache';
import { contentGoalService, userService } from '@/services';

export async function updateGoalTarget(id: string, weekly_target: number) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return { error: 'Yetkisiz işlem' };
  }

  const ok = await contentGoalService.updateTarget(id, weekly_target);
  if (!ok) return { error: 'Güncellenemedi' };

  revalidatePath('/content/goals');
  return { success: true };
}
