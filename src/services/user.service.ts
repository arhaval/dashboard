/**
 * User Service
 * Handles all user-related data operations
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User, UserRole } from '@/types';

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserInput {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
  // Contact & Payment fields
  phone?: string | null;
  iban?: string | null;
  bank_name?: string | null;
  address?: string | null;
  notes?: string | null;
}

export const userService = {
  /**
   * Get all users
   * Requires admin role for full list, otherwise returns empty
   */
  async getAll(): Promise<User[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<User | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  /**
   * Get current authenticated user's profile
   */
  async getCurrentUser(): Promise<User | null> {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    return this.getById(authUser.id);
  },

  /**
   * Create a new user (admin only)
   * Creates auth user and public.users profile
   */
  async create(input: CreateUserInput): Promise<{ user: User | null; error?: string }> {
    const adminClient = createAdminClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating auth user:', authError.message);
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Failed to create auth user' };
    }

    // 2. Create public.users profile
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        email: input.email,
        full_name: input.full_name,
        role: input.role,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError.message);
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { user: null, error: profileError.message };
    }

    return { user: profile };
  },

  /**
   * Update user profile (admin only)
   */
  async update(id: string, input: UpdateUserInput): Promise<{ user: User | null; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error.message);
      return { user: null, error: error.message };
    }

    return { user: data };
  },

  /**
   * Toggle user active status (soft disable)
   */
  async toggleStatus(id: string): Promise<{ user: User | null; error?: string }> {
    const supabase = await createClient();

    // Get current status
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !currentUser) {
      return { user: null, error: 'User not found' };
    }

    // Toggle status
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: !currentUser.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling user status:', error.message);
      return { user: null, error: error.message };
    }

    return { user: data };
  },

  /**
   * Get user stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase.from('users').select('role, is_active');

    if (error || !data) {
      return { total: 0, active: 0, inactive: 0, byRole: {} };
    }

    const byRole: Record<string, number> = {};
    data.forEach((u) => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    });

    return {
      total: data.length,
      active: data.filter((u) => u.is_active).length,
      inactive: data.filter((u) => !u.is_active).length,
      byRole,
    };
  },
};
