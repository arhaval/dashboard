'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { instagramService } from '@/services/instagram.service';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthsAgo(n: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function backfillInstagram(): Promise<{ filled?: number; error?: string }> {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') return { error: 'Yetki yok' };

  const result = await instagramService.backfill(monthsAgo(11), currentMonth());
  revalidatePath('/social');
  return { filled: result.filled };
}
