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
      .select('*, user:users(id, full_name, email, role)')
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

  /**
   * Returns total unpaid amount = sum of cost for APPROVED items.
   * This is money owed to team members but not yet paid.
   */
  async getUnpaidTotal(): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('work_items')
      .select('cost')
      .eq('status', 'APPROVED')
      .not('cost', 'is', null);

    if (error || !data) return 0;
    return data.reduce((sum, i) => sum + Number(i.cost ?? 0), 0);
  },

  /**
   * Returns content production metrics (VOICE + EDIT only) for a given month.
   * Also returns previous month for comparison.
   */
  async getContentStats(month: string): Promise<{
    thisMonth: { voice: number; edit: number; total: number };
    lastMonth: { voice: number; edit: number; total: number };
    change: number;
  }> {
    const supabase = await createClient();

    // Calculate last month string
    const [year, m] = month.split('-').map(Number);
    const lastMonthDate = new Date(year, m - 2, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Fetch all content items and filter in memory (simple & reliable)
    const { data: allContent } = await supabase
      .from('work_items')
      .select('work_type, work_date')
      .in('work_type', ['VOICE', 'EDIT']);

    const contentItems = allContent ?? [];

    const thisMonthItems = contentItems.filter((i) => i.work_date.startsWith(month));
    const lastMonthItems = contentItems.filter((i) => i.work_date.startsWith(lastMonth));

    const thisMonthStats = {
      voice: thisMonthItems.filter((i) => i.work_type === 'VOICE').length,
      edit: thisMonthItems.filter((i) => i.work_type === 'EDIT').length,
      total: thisMonthItems.length,
    };

    const lastMonthStats = {
      voice: lastMonthItems.filter((i) => i.work_type === 'VOICE').length,
      edit: lastMonthItems.filter((i) => i.work_type === 'EDIT').length,
      total: lastMonthItems.length,
    };

    const change =
      lastMonthStats.total === 0
        ? thisMonthStats.total > 0 ? 100 : 0
        : Math.round(((thisMonthStats.total - lastMonthStats.total) / lastMonthStats.total) * 100);

    return { thisMonth: thisMonthStats, lastMonth: lastMonthStats, change };
  },

  /**
   * Returns monthly content production trend for the last N months.
   * Used for the content trend line chart on the dashboard.
   */
  async getContentTrend(months = 6): Promise<
    Array<{ month: string; label: string; voice: number; edit: number; total: number }>
  > {
    const supabase = await createClient();

    const { data } = await supabase
      .from('work_items')
      .select('work_type, work_date')
      .in('work_type', ['VOICE', 'EDIT'])
      .order('work_date', { ascending: false });

    const items = data ?? [];

    const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    // Build last N months list
    const now = new Date();
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${TR_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

      const monthItems = items.filter((item) => item.work_date.startsWith(monthStr));
      result.push({
        month: monthStr,
        label,
        voice: monthItems.filter((item) => item.work_type === 'VOICE').length,
        edit: monthItems.filter((item) => item.work_type === 'EDIT').length,
        total: monthItems.length,
      });
    }

    return result;
  },

  /**
   * Returns per-user content production for a given month.
   * Used for the team performance bar chart.
   */
  async getTeamContentStats(month: string): Promise<
    Array<{ userId: string; name: string; voice: number; edit: number; total: number }>
  > {
    const supabase = await createClient();

    const { data } = await supabase
      .from('work_items')
      .select('user_id, work_type, users(full_name)')
      .in('work_type', ['VOICE', 'EDIT'])
      .gte('work_date', `${month}-01`)
      .lt('work_date', (() => {
        const [y, m] = month.split('-').map(Number);
        const next = new Date(y, m, 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
      })());

    const items = data ?? [];
    const userMap = new Map<string, { userId: string; name: string; voice: number; edit: number; total: number }>();

    for (const item of items) {
      const user = item.users as unknown as { full_name: string } | null;
      const name = user?.full_name ?? 'Bilinmiyor';
      const existing = userMap.get(item.user_id) ?? {
        userId: item.user_id,
        name,
        voice: 0,
        edit: 0,
        total: 0,
      };
      if (item.work_type === 'VOICE') existing.voice += 1;
      if (item.work_type === 'EDIT') existing.edit += 1;
      existing.total += 1;
      userMap.set(item.user_id, existing);
    }

    return Array.from(userMap.values()).sort((a, b) => b.total - a.total);
  },
};
