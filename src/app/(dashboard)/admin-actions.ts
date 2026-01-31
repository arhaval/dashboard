'use server';

/**
 * Admin-only delete actions
 * Uses service role key for reliable Vercel execution
 */

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Helper to verify current user is ADMIN
async function verifyAdmin(): Promise<{ isAdmin: boolean; userId: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, userId: null };
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return {
    isAdmin: dbUser?.role === 'ADMIN',
    userId: user.id
  };
}

// ============================================
// WORK ITEMS
// ============================================

export async function deleteWorkItem(id: string): Promise<{ success: boolean; error?: string }> {
  const { isAdmin } = await verifyAdmin();

  // Only admins can delete
  if (!isAdmin) {
    return { success: false, error: 'Yetkisiz erişim' };
  }

  const adminClient = createAdminClient();

  // Check if work item exists and is not paid
  const { data: workItem, error: fetchError } = await adminClient
    .from('work_items')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !workItem) {
    return { success: false, error: 'İş kaydı bulunamadı' };
  }

  if (workItem.status === 'PAID') {
    return { success: false, error: 'Ödenen iş kayıtları silinemez' };
  }

  // Delete the work item
  const { error } = await adminClient
    .from('work_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting work item:', error.message);
    return { success: false, error: 'Silme işlemi başarısız' };
  }

  // Revalidate all pages that show work items
  revalidatePath('/work-items');
  revalidatePath('/payments');
  revalidatePath('/');  // Dashboard
  return { success: true };
}

// ============================================
// PAYMENTS
// ============================================

export async function deletePayment(id: string): Promise<{ success: boolean; error?: string }> {
  const { isAdmin } = await verifyAdmin();

  if (!isAdmin) {
    return { success: false, error: 'Yetkisiz erişim' };
  }

  const adminClient = createAdminClient();

  // Check if payment exists
  const { data: payment, error: fetchError } = await adminClient
    .from('payments')
    .select('status, payment_items(work_item_id)')
    .eq('id', id)
    .single();

  if (fetchError || !payment) {
    return { success: false, error: 'Ödeme bulunamadı' };
  }

  // If payment was PAID, we need to revert work items to APPROVED
  if (payment.status === 'PAID') {
    const workItemIds = payment.payment_items?.map((pi: { work_item_id: string }) => pi.work_item_id) || [];

    if (workItemIds.length > 0) {
      await adminClient
        .from('work_items')
        .update({ status: 'APPROVED' })
        .in('id', workItemIds);
    }

    // Delete associated transaction
    await adminClient
      .from('transactions')
      .delete()
      .eq('payment_id', id);
  }

  // Delete payment items first (foreign key constraint)
  await adminClient
    .from('payment_items')
    .delete()
    .eq('payment_id', id);

  // Delete the payment
  const { error } = await adminClient
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting payment:', error.message);
    return { success: false, error: 'Silme işlemi başarısız' };
  }

  // Revalidate all related pages
  revalidatePath('/payments');
  revalidatePath('/finance');
  revalidatePath('/work-items');
  revalidatePath('/');  // Dashboard
  return { success: true };
}

// ============================================
// TRANSACTIONS
// ============================================

export async function deleteTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  const { isAdmin } = await verifyAdmin();

  if (!isAdmin) {
    return { success: false, error: 'Yetkisiz erişim' };
  }

  const adminClient = createAdminClient();

  // Check if transaction is linked to a payment
  const { data: transaction, error: fetchError } = await adminClient
    .from('transactions')
    .select('payment_id')
    .eq('id', id)
    .single();

  if (fetchError || !transaction) {
    return { success: false, error: 'İşlem bulunamadı' };
  }

  if (transaction.payment_id) {
    return { success: false, error: 'Ödemeye bağlı işlemler silinemez. Önce ödemeyi silin.' };
  }

  // Delete the transaction
  const { error } = await adminClient
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error.message);
    return { success: false, error: 'Silme işlemi başarısız' };
  }

  // Revalidate all related pages
  revalidatePath('/finance');
  revalidatePath('/payments');
  revalidatePath('/');  // Dashboard
  return { success: true };
}

// ============================================
// SOCIAL METRICS
// ============================================

export async function deleteSocialMetric(id: string): Promise<{ success: boolean; error?: string }> {
  const { isAdmin } = await verifyAdmin();

  if (!isAdmin) {
    return { success: false, error: 'Yetkisiz erişim' };
  }

  const adminClient = createAdminClient();

  // Delete the metric
  const { error } = await adminClient
    .from('social_monthly_metrics')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting social metric:', error.message);
    return { success: false, error: 'Silme işlemi başarısız' };
  }

  revalidatePath('/social');
  revalidatePath('/reports');
  return { success: true };
}
