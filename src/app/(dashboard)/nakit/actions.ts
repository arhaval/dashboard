'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { cashFlowService } from '@/services';
import type { IncomeCategory } from '@/services/cash-flow.service';

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'ADMIN') redirect('/');
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createIncomeAction(formData: FormData) {
  await requireAdmin();

  const result = await cashFlowService.createIncome({
    title:         formData.get('title') as string,
    amount:        Number(formData.get('amount')),
    category:      (formData.get('category') as IncomeCategory) || 'DIGER',
    expected_date: formData.get('expected_date') as string,
    notes:         (formData.get('notes') as string) || undefined,
  });

  if (result.error) throw new Error(result.error);
  revalidatePath('/nakit');
}

export async function createExpenseAction(formData: FormData) {
  await requireAdmin();

  const result = await cashFlowService.createExpense({
    title:    formData.get('title') as string,
    amount:   Number(formData.get('amount')),
    category: (formData.get('category') as string) || 'Diğer',
    due_date: formData.get('due_date') as string,
    notes:    (formData.get('notes') as string) || undefined,
  });

  if (result.error) throw new Error(result.error);
  revalidatePath('/nakit');
}

export async function markIncomeReceivedAction(id: string) {
  await requireAdmin();
  const result = await cashFlowService.markIncomeReceived(id);
  if (result.error) throw new Error(result.error);
  revalidatePath('/nakit');
  revalidatePath('/finance'); // finance sayfası da güncellensin
}

export async function markExpensePaidAction(id: string) {
  await requireAdmin();
  const result = await cashFlowService.markExpensePaid(id);
  if (result.error) throw new Error(result.error);
  revalidatePath('/nakit');
  revalidatePath('/finance');
}

export async function cancelIncomeAction(id: string) {
  await requireAdmin();
  const result = await cashFlowService.cancelIncome(id);
  if (result.error) throw new Error(result.error);
  revalidatePath('/nakit');
}

export async function cancelExpenseAction(id: string) {
  await requireAdmin();
  const result = await cashFlowService.cancelExpense(id);
  if (result.error) throw new Error(result.error);
  revalidatePath('/nakit');
}
