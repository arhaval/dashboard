/**
 * Work Items Server Actions
 * Admin-only actions for work item management
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { workItemService } from '@/services';
import { WORK_STATUS_TRANSITIONS } from '@/constants';
import type { WorkStatus } from '@/types';

interface UpdateStatusResult {
  success: boolean;
  error?: string;
}

/**
 * Update work item status (admin only)
 * Validates admin role and prevents self-status-change
 */
export async function updateWorkItemStatus(
  workItemId: string,
  newStatus: WorkStatus
): Promise<UpdateStatusResult> {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { success: false, error: 'Unauthorized' };
  }

  // 2. Get user role from database
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (userError || !dbUser) {
    return { success: false, error: 'User not found' };
  }

  // 3. Check admin role
  if (dbUser.role !== 'ADMIN') {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  // 4. Get work item to check ownership
  const workItem = await workItemService.getById(workItemId);

  if (!workItem) {
    return { success: false, error: 'Work item not found' };
  }

  // 5. Prevent admin from changing status of their own work
  if (workItem.user_id === authUser.id) {
    return { success: false, error: 'Cannot change status of your own work item' };
  }

  // 6. Validate status transition
  if (!WORK_STATUS_TRANSITIONS[workItem.status].includes(newStatus)) {
    return {
      success: false,
      error: `Invalid status transition: ${workItem.status} → ${newStatus}`,
    };
  }

  // 6.5. Require cost before APPROVED
  if (newStatus === 'APPROVED' && !workItem.cost) {
    return {
      success: false,
      error: 'Cost must be set before approving',
    };
  }

  // 7. Update status
  const updated = await workItemService.update(workItemId, { status: newStatus });

  if (!updated) {
    return { success: false, error: 'Failed to update status' };
  }

  // 8. Revalidate the page
  revalidatePath('/work-items');

  return { success: true };
}

/**
 * Update work item cost (admin only)
 */
export async function updateWorkItemCost(
  workItemId: string,
  cost: number
): Promise<UpdateStatusResult> {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { success: false, error: 'Unauthorized' };
  }

  // 2. Get user role from database
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (userError || !dbUser) {
    return { success: false, error: 'User not found' };
  }

  // 3. Check admin role
  if (dbUser.role !== 'ADMIN') {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  // 4. Get work item to check ownership
  const workItem = await workItemService.getById(workItemId);

  if (!workItem) {
    return { success: false, error: 'Work item not found' };
  }

  // 5. Prevent admin from setting cost on their own work
  if (workItem.user_id === authUser.id) {
    return { success: false, error: 'Cannot set cost on your own work item' };
  }

  // 6. Validate cost
  if (cost <= 0) {
    return { success: false, error: 'Cost must be greater than 0' };
  }

  // 7. Only allow cost edit on DRAFT items
  if (workItem.status !== 'DRAFT') {
    return { success: false, error: 'Can only set cost on DRAFT items' };
  }

  // 8. Update cost
  const updated = await workItemService.update(workItemId, { cost });

  if (!updated) {
    return { success: false, error: 'Failed to update cost' };
  }

  // 9. Revalidate the page
  revalidatePath('/work-items');

  return { success: true };
}
