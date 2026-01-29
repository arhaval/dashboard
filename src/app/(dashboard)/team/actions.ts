/**
 * Team Management Server Actions
 * Admin-only actions for user CRUD
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { userService, type CreateUserInput, type UpdateUserInput } from '@/services';
import type { UserRole } from '@/types';

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
 * Create a new team member (admin only)
 * Creates auth user + public.users profile
 */
export async function createTeamMember(input: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Validate input
  if (!input.email || !input.password || !input.full_name || !input.role) {
    return { success: false, error: 'All fields are required' };
  }

  if (input.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const validRoles: UserRole[] = ['ADMIN', 'PUBLISHER', 'EDITOR', 'VOICE'];
  if (!validRoles.includes(input.role)) {
    return { success: false, error: 'Invalid role' };
  }

  // 3. Create user via service
  const result = await userService.create(input);

  if (result.error || !result.user) {
    return { success: false, error: result.error || 'Failed to create user' };
  }

  // 4. Revalidate team page
  revalidatePath('/team');

  return { success: true };
}

/**
 * Update team member role (admin only)
 */
export async function updateTeamMemberRole(
  userId: string,
  newRole: UserRole
): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Validate role
  const validRoles: UserRole[] = ['ADMIN', 'PUBLISHER', 'EDITOR', 'VOICE'];
  if (!validRoles.includes(newRole)) {
    return { success: false, error: 'Invalid role' };
  }

  // 3. Get current user to prevent self-demotion
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser?.id === userId) {
    return { success: false, error: 'Cannot change your own role' };
  }

  // 4. Update user role
  const result = await userService.update(userId, { role: newRole });

  if (result.error || !result.user) {
    return { success: false, error: result.error || 'Failed to update role' };
  }

  // 5. Revalidate team page
  revalidatePath('/team');

  return { success: true };
}

/**
 * Toggle team member active status (admin only)
 */
export async function toggleTeamMemberStatus(userId: string): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Get current user to prevent self-deactivation
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser?.id === userId) {
    return { success: false, error: 'Cannot deactivate your own account' };
  }

  // 3. Toggle status
  const result = await userService.toggleStatus(userId);

  if (result.error || !result.user) {
    return { success: false, error: result.error || 'Failed to toggle status' };
  }

  // 4. Revalidate team page
  revalidatePath('/team');

  return { success: true };
}

/**
 * Update team member profile (admin only)
 */
export async function updateTeamMember(
  userId: string,
  input: UpdateUserInput
): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Validate input
  if (input.full_name !== undefined && input.full_name.trim() === '') {
    return { success: false, error: 'Name cannot be empty' };
  }

  if (input.role !== undefined) {
    const validRoles: UserRole[] = ['ADMIN', 'PUBLISHER', 'EDITOR', 'VOICE'];
    if (!validRoles.includes(input.role)) {
      return { success: false, error: 'Invalid role' };
    }

    // Prevent self-role-change
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser?.id === userId) {
      return { success: false, error: 'Cannot change your own role' };
    }
  }

  // 3. Update user
  const result = await userService.update(userId, input);

  if (result.error || !result.user) {
    return { success: false, error: result.error || 'Failed to update user' };
  }

  // 4. Revalidate team page
  revalidatePath('/team');

  return { success: true };
}
