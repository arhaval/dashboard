'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import {
  youtubeAnalyticsService,
  type ReconcileResult,
} from '@/services/youtube-analytics.service';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthsAgo(n: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Son 12 ayı Analytics'ten yeniden doldurur (yalnızca admin). Ardından Studio'nun
 * son 28 günlük penceresi çekilir: panelin saydığı ile Studio'nun toplamı
 * arasındaki fark ve farkın hangi içerik türünden geldiği görünsün.
 */
export async function backfillYouTube(): Promise<{
  filled?: number;
  error?: string;
  reconcile?: ReconcileResult | null;
}> {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') return { error: 'Yetki yok' };

  const result = await youtubeAnalyticsService.backfill(monthsAgo(11), currentMonth());
  const reconcile = await youtubeAnalyticsService.reconcileRange().catch(() => null);
  revalidatePath('/social');
  revalidatePath('/social/data');
  return { filled: result.filled, error: result.error, reconcile };
}
