/**
 * Work Item Service
 * Handles all work item data operations
 */

import { createClient } from '@/lib/supabase/server';
import type { WorkItem, WorkItemFilters, CreateWorkItemInput } from '@/types';

export const workItemService = {
  /**
   * Get all work items with optional filters
   * Admins see all, users see only their own (handled by RLS)
   */
  async getAll(filters?: WorkItemFilters): Promise<WorkItem[]> {
    const supabase = await createClient();

    let query = supabase
      .from('work_items')
      .select('*, user:users(id, full_name, email, role), payment_items(payment_id, payment:payments(id, status))')
      .order('work_date', { ascending: false });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.work_type) {
      query = query.eq('work_type', filters.work_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.date_from) {
      query = query.gte('work_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('work_date', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching work items:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get work item by ID
   */
  async getById(id: string): Promise<WorkItem | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('work_items')
      .select('*, user:users(id, full_name, email, role)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching work item:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Create a new work item
   */
  async create(input: CreateWorkItemInput & { user_id: string }): Promise<WorkItem | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('work_items')
      .insert({
        user_id: input.user_id,
        work_type: input.work_type,
        work_date: input.work_date,
        notes: input.notes || null,
        match_name: input.match_name || null,
        duration_minutes: input.duration_minutes || null,
        content_name: input.content_name || null,
        content_length: input.content_length || null,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating work item:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Update work item (admin only for cost/status)
   */
  async update(
    id: string,
    updates: Partial<Pick<WorkItem, 'cost' | 'status' | 'notes'>>
  ): Promise<WorkItem | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('work_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating work item:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Delete work item (only DRAFT status)
   */
  async delete(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('work_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting work item:', error.message);
      return false;
    }

    return true;
  },

  /**
   * Calculate total cost for a list of work items
   */
  calculateTotal(items: WorkItem[]): number {
    return items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  },

  /**
   * Get summary stats for work items
   */
  async getStats(userId?: string): Promise<{
    total: number;
    draft: number;
    approved: number;
    paid: number;
  }> {
    const supabase = await createClient();

    let query = supabase.from('work_items').select('status');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return { total: 0, draft: 0, approved: 0, paid: 0 };
    }

    return {
      total: data.length,
      draft: data.filter((i) => i.status === 'DRAFT').length,
      approved: data.filter((i) => i.status === 'APPROVED').length,
      paid: data.filter((i) => i.status === 'PAID').length,
    };
  },
};
