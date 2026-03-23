/**
 * Social Metrics Server Actions
 * Admin-only actions for monthly social media metrics
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { socialMetricsService } from '@/services';
import { METRICS_PLATFORMS } from '@/constants';
import type { CreateSocialMonthlyMetricsInput, CreateSocialGoalInput, MetricsPlatform } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Verify current user is admin
 */
async function verifyAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
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

  return { isAdmin: true };
}

/**
 * Create or update monthly metrics (admin only)
 */
export async function upsertSocialMetrics(
  input: CreateSocialMonthlyMetricsInput
): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Validate input
  if (!input.month || !input.platform) {
    return { success: false, error: 'Month and platform are required' };
  }

  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(input.month)) {
    return { success: false, error: 'Invalid month format. Use YYYY-MM' };
  }

  const validPlatforms = METRICS_PLATFORMS;
  if (!validPlatforms.includes(input.platform)) {
    return { success: false, error: 'Invalid platform' };
  }

  if (input.followers_total < 0) {
    return { success: false, error: 'Followers cannot be negative' };
  }

  // 3. Upsert via service
  const result = await socialMetricsService.upsert(input);

  if (result.error || !result.metrics) {
    return { success: false, error: result.error || 'Failed to save metrics' };
  }

  // 4. Revalidate
  revalidatePath('/social');

  return { success: true };
}

/**
 * Create or update monthly note (admin only)
 */
export async function upsertMonthlyNote(
  month: string,
  notes: string
): Promise<ActionResult> {
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    return { success: false, error: 'Invalid month format' };
  }

  const result = await socialMetricsService.upsertNote(month, notes);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/social');
  return { success: true };
}

/**
 * Create or update a social goal (admin only)
 */
export async function upsertSocialGoal(
  input: CreateSocialGoalInput
): Promise<ActionResult> {
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  if (!input.month || !input.platform || !input.metric_key || input.target_value <= 0) {
    return { success: false, error: 'Invalid goal data' };
  }

  const result = await socialMetricsService.upsertGoal(input);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/social');
  return { success: true };
}

/**
 * Delete a social goal (admin only)
 */
export async function deleteSocialGoal(id: string): Promise<ActionResult> {
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  const result = await socialMetricsService.deleteGoal(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/social');
  return { success: true };
}

/**
 * Delete monthly metrics (admin only)
 */
export async function deleteSocialMetrics(id: string): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Delete via service
  const result = await socialMetricsService.delete(id);

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to delete metrics' };
  }

  // 3. Revalidate
  revalidatePath('/social');

  return { success: true };
}
