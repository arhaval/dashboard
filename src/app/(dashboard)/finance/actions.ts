/**
 * Finans genel bakış — Server Actions (admin-only)
 * Alacak tahsilatları: dış ortak ayı, sponsor taksiti, beklenen gelir.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { financeOverviewService } from '@/services/finance-overview.service';
import { sponsorService } from '@/services/sponsor.service';
import { cashFlowService } from '@/services/cash-flow.service';
import { todayTR } from '@/lib/utils/dates';

interface ActionResult {
  success: boolean;
  error?: string;
}

async function adminId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data?.role === 'ADMIN' ? user.id : null;
}

function revalidateFinance() {
  revalidatePath('/finance');
  revalidatePath('/nakit');
  revalidatePath('/sponsorluklar');
  revalidatePath('/');
}

const collectSchema = z.object({
  clientId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().positive('Tutar sıfırdan büyük olmalı.'),
  collectedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Dış ortağın bir ayını tahsil et → gelir kaydı + tahsilat. */
export async function collectClientMonthAction(input: z.input<typeof collectSchema>): Promise<ActionResult> {
  const id = await adminId();
  if (!id) return { success: false, error: 'Yetkisiz' };

  const parsed = collectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' };

  const res = await financeOverviewService.collectClientMonth({
    ...parsed.data,
    collectedOn: parsed.data.collectedOn ?? todayTR(),
    createdBy: id,
  });
  if (res.error) return { success: false, error: res.error };

  revalidateFinance();
  revalidatePath('/ekstra-isler');
  return { success: true };
}

/**
 * Sponsor taksiti tahsil edildi.
 * @param post true → gelir kaydı yaz; false → para zaten finansa girildi, sadece işaretle.
 */
export async function markSponsorDueAction(paymentId: string, post: boolean): Promise<ActionResult> {
  if (!(await adminId())) return { success: false, error: 'Yetkisiz' };
  if (!z.string().uuid().safeParse(paymentId).success) return { success: false, error: 'Geçersiz kayıt' };

  const today = todayTR();
  const res = post
    ? await sponsorService.markPaid(paymentId, today)
    : await sponsorService.markPaidWithoutPosting(paymentId, today);
  if (res.error) return { success: false, error: res.error };

  revalidateFinance();
  return { success: true };
}

/** Beklenen gelir tahsil edildi → gelir kaydı. */
export async function markExpectedIncomeAction(id: string): Promise<ActionResult> {
  if (!(await adminId())) return { success: false, error: 'Yetkisiz' };
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Geçersiz kayıt' };

  const res = await cashFlowService.markIncomeReceived(id);
  if (res.error) return { success: false, error: res.error };

  revalidateFinance();
  return { success: true };
}
