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
 */
export async function createPaymentFromWorkItems(
  userId: string,
  workItemIds: string[],
  notes?: string
): Promise<ActionResult> {
  const adminCheck = await verifyAdmin();

  if (!adminCheck.isAdmin) {
    return { success: false, error: adminCheck.error };
  }

  // Prevent admin from creating payment for themselves
  if (userId === adminCheck.userId) {
    return { success: false, error: 'Cannot create payment for yourself' };
  }

  const result = await paymentService.createFromWorkItems(userId, workItemIds, notes);

  if (!result.payment) {
    return { success: false, error: result.error };
  }

  revalidatePath('/payments');
  revalidatePath('/work-items');

  return { success: true };
}

/**
 * Mark a payment as paid (creates transaction record)
 */
export async function markPaymentAsPaid(paymentId: string): Promise<ActionResult> {
  const adminCheck = await verifyAdmin();

  if (!adminCheck.isAdmin) {
    return { success: false, error: adminCheck.error };
  }

  const result = await paymentService.markAsPaid(paymentId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/payments');
  revalidatePath('/work-items');
  revalidatePath('/finance');

  return { success: true };
}

/**
 * Cancel a pending payment
 */
export async function cancelPayment(paymentId: string): Promise<ActionResult> {
  const adminCheck = await verifyAdmin();

  if (!adminCheck.isAdmin) {
    return { success: false, error: adminCheck.error };
  }

  const result = await paymentService.cancel(paymentId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/payments');

  return { success: true };
}
