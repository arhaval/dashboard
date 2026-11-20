/**
 * Ücretler (Rate Cards) — Server Actions (admin-only)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { rateCardService } from '@/services/rate-card.service';
import type { UpsertRateCardInput } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
}

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data?.role === 'ADMIN';
}

export async function upsertRateAction(input: UpsertRateCardInput): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { success: false, error: 'Yetkisiz' };

  if (!input.user_id || !input.client_id) return { success: false, error: 'Kişi ve müşteri zorunlu.' };
  if (!(input.pay_amount > 0)) return { success: false, error: 'Hak ediş tutarı geçersiz.' };

  const res = await rateCardService.upsert(input);
  if (!res) return { success: false, error: 'Fiyat kaydedilemedi.' };

  revalidatePath('/ucretler');
  return { success: true };
}

export async function deleteRateAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { success: false, error: 'Yetkisiz' };
  const ok = await rateCardService.delete(id);
  if (!ok) return { success: false, error: 'Silinemedi.' };

  revalidatePath('/ucretler');
  return { success: true };
}
