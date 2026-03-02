/**
 * Payments Server Actions
 * Admin-only actions for payment management
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { paymentService } from '@/services';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Verify current user is admin
 */
async function verifyAdmin(): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { isAdmin: false, error: 'Unauthorized' };
  }

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (userError || !dbUser) {
    return { isAdmin: false, error: 'User not found' };
  }

  if (dbUser.role !== 'ADMIN') {
    return { isAdmin: false, error: 'Forbidden: Admin access required' };
  }

  return { isAdmin: true, userId: authUser.id };
}

/**
 * Create a payment from approved work items
 * Business logic is in RPC - this action only handles auth and revalidation
 */
export async function createPaymentFromWorkItems(
  userId: string,
  workItemIds: string[],
  notes?: string
): Promise<ActionResult> {
  const adminCheck = await verifyAdmin();

  if (!adminCheck.isAdmin || !adminCheck.userId) {
    return { success: false, error: adminCheck.error };
  }

  // RPC handles: admin check, self-payment prevention, idempotency, atomic operation
  const result = await paymentService.createFromWorkItems(
    userId,
    workItemIds,
    adminCheck.userId,
    notes
  );

  if (!result.paymentId) {
    return { success: false, error: result.error };
  }

  // Revalidate all related pages
  revalidatePath('/payments');
  revalidatePath('/work-items');
  revalidatePath('/');  // Dashboard - for team member profiles

  return { success: true };
}

/**
 * Mark a payment as paid (creates transaction record)
 * Business logic is in RPC - atomic operation
 */
export async function markPaymentAsPaid(paymentId: string): Promise<ActionResult> {
  const adminCheck = await verifyAdmin();

  if (!adminCheck.isAdmin || !adminCheck.userId) {
    return { success: false, error: adminCheck.error };
  }

  // RPC handles: admin check, self-payment prevention, status validation, atomic update
  const result = await paymentService.markAsPaid(paymentId, adminCheck.userId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Revalidate all related pages
  revalidatePath('/payments');
  revalidatePath('/work-items');
  revalidatePath('/finance');
  revalidatePath('/');  // Dashboard - for team member profiles

  return { success: true };
}

/**
 * Cancel a pending payment
 * Business logic is in RPC - atomic operation, reverts work items if needed
 */
/**
 * Mark multiple payments as paid in sequence
 * Each payment is processed atomically via RPC
 */
export async function bulkMarkPaymentsAsPaid(
  paymentIds: string[]
): Promise<{ success: boolean; paidCount: number; failedCount: number; errors: string[] }> {
  const adminCheck = await verifyAdmin();

  if (!adminCheck.isAdmin || !adminCheck.userId) {
    return { success: false, paidCount: 0, failedCount: paymentIds.length, errors: [adminCheck.error || 'Yetkisiz'] };
  }

  let paidCount = 0;
  const errors: string[] = [];

  for (const paymentId of paymentIds) {
    const result = await paymentService.markAsPaid(paymentId, adminCheck.userId);
    if (result.success) {
      paidCount++;
    } else {
      errors.push(result.error || `Ödeme ${paymentId} başarısız`);
    }
  }

  // Revalidate all related pages
  revalidatePath('/payments');
  revalidatePath('/work-items');
  revalidatePath('/finance');
  revalidatePath('/');

  return {
    success: errors.length === 0,
    paidCount,
    failedCount: errors.length,
    errors,
  };
}

/**
 * Cancel a pending payment
 * Business logic is in RPC - atomic operation, reverts work items if needed
 */
export async function cancelPayment(paymentId: string): Promise<ActionResult> {
  const adminCheck = await verifyAdmin();

  if (!adminCheck.isAdmin || !adminCheck.userId) {
    return { success: false, error: adminCheck.error };
  }

  // RPC handles: admin check, status validation, work item reversion
  const result = await paymentService.cancel(paymentId, adminCheck.userId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Revalidate all related pages
  revalidatePath('/payments');
  revalidatePath('/work-items');
  revalidatePath('/');  // Dashboard - for team member profiles

  return { success: true };
}
