'use server';

/**
 * Ayı elle "tamamlandı" işaretleme / geri açma.
 *
 * Neden gerekli: hatırlatma "eksikler dolana kadar" susmuyordu. Geçmişe dönük
 * veri artık alınamadığında (platform o kadar geriye istatistik vermiyor, o ay
 * yayın yapılmamış) sistem sonsuza kadar olmayacak bir veriyi istiyordu.
 *
 * Kapatmak VERİ SİLMEZ: girilmiş ne varsa durur, yalnızca "daha fazlası
 * beklenmiyor" denir. Geri açmak da veriye dokunmaz.
 */

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { createAdminClient } from '@/lib/supabase/admin';

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export interface ClosureResult {
  success: boolean;
  error?: string;
}

function revalidateSocial() {
  revalidatePath('/social');
  revalidatePath('/social/data');
  revalidatePath('/social/analytics');
}

export async function closeMonth(month: string, note?: string): Promise<ClosureResult> {
  const user = await userService.getCurrentUser();
  if (!user) return { success: false, error: 'Oturum gerekli' };
  if (user.role !== 'ADMIN') return { success: false, error: 'Yetki yok' };
  if (!MONTH_PATTERN.test(month)) return { success: false, error: 'Ay formatı YYYY-MM olmalı' };

  const admin = createAdminClient();
  const { error } = await admin.from('social_month_closures').upsert(
    {
      month,
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      note: note?.trim() || null,
    },
    { onConflict: 'month' }
  );
  if (error) return { success: false, error: error.message };

  revalidateSocial();
  return { success: true };
}

export async function reopenMonth(month: string): Promise<ClosureResult> {
  const user = await userService.getCurrentUser();
  if (!user) return { success: false, error: 'Oturum gerekli' };
  if (user.role !== 'ADMIN') return { success: false, error: 'Yetki yok' };
  if (!MONTH_PATTERN.test(month)) return { success: false, error: 'Ay formatı YYYY-MM olmalı' };

  const admin = createAdminClient();
  const { error } = await admin.from('social_month_closures').delete().eq('month', month);
  if (error) return { success: false, error: error.message };

  revalidateSocial();
  return { success: true };
}
