/**
 * Content Plan Service
 * İçerik takvimi planlama servisi
 * Handles CRUD + status management for content_plans table
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentPlan, CreateContentPlanInput, ContentPlanStatus } from '@/types';

const SELECT_QUERY = `
  id, title, content_type, planned_date,
  assigned_to, created_by, status, priority,
  notes, work_item_id, platform, content_subtype,
  created_at, updated_at,
  assignee:users!content_plans_assigned_to_fkey(id, full_name, avatar_url)
`;

export const contentPlanService = {
  /** List plans for a month (YYYY-MM) */
  async getByMonth(month: string): Promise<ContentPlan[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('content_plans')
      .select(SELECT_QUERY)
      .gte('planned_date', `${month}-01`)
      .lt('planned_date', (() => {
        const [y, m] = month.split('-').map(Number);
        const next = new Date(y, m, 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
      })())
      .order('planned_date', { ascending: true })
      .order('priority', { ascending: false });

    return (data ?? []) as unknown as ContentPlan[];
  },

  /** Get stats for a month */
  async getMonthStats(month: string): Promise<{
    planned: number;
    inProgress: number;
    done: number;
    cancelled: number;
    overdue: number;
    completionRate: number;
  }> {
    const plans = await contentPlanService.getByMonth(month);
    const today = new Date().toISOString().slice(0, 10);

    const planned = plans.filter((p) => p.status === 'PLANNED').length;
    const inProgress = plans.filter((p) => p.status === 'IN_PROGRESS').length;
    const done = plans.filter((p) => p.status === 'DONE').length;
    const cancelled = plans.filter((p) => p.status === 'CANCELLED').length;
    const overdue = plans.filter(
      (p) => (p.status === 'PLANNED' || p.status === 'IN_PROGRESS') && p.planned_date < today
    ).length;
    const active = plans.filter((p) => p.status !== 'CANCELLED').length;
    const completionRate = active > 0 ? Math.round((done / active) * 100) : 0;

    return { planned, inProgress, done, cancelled, overdue, completionRate };
  },

  /** Create a new plan (admin only) */
  async create(input: CreateContentPlanInput, createdBy: string): Promise<ContentPlan | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('content_plans')
      .insert({
        title: input.title,
        content_type: input.content_type,
        planned_date: input.planned_date,
        assigned_to: input.assigned_to ?? null,
        priority: input.priority ?? 'NORMAL',
        notes: input.notes ?? null,
        platform: input.platform ?? null,
        content_subtype: input.content_subtype ?? null,
        created_by: createdBy,
        status: 'PLANNED',
      })
      .select(SELECT_QUERY)
      .single();

    if (error) return null;
    return data as unknown as ContentPlan;
  },

  /** Update status */
  async updateStatus(id: string, status: ContentPlanStatus): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('content_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  },

  /** Delete a plan */
  async delete(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from('content_plans').delete().eq('id', id);
    return !error;
  },

  /** Get available months that have plans */
  async getAvailableMonths(): Promise<string[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('content_plans')
      .select('planned_date')
      .order('planned_date', { ascending: false });

    const months = new Set<string>();
    for (const row of data ?? []) {
      months.add(row.planned_date.slice(0, 7));
    }
    // Always include current month
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  },

  /** Content count by type for a month (DONE only) */
  async getCountByType(month: string): Promise<{ VOICE: number; EDIT: number; STREAM: number }> {
    const plans = await contentPlanService.getByMonth(month);
    const done = plans.filter((p) => p.status === 'DONE');
    return {
      VOICE: done.filter((p) => p.content_type === 'VOICE').length,
      EDIT: done.filter((p) => p.content_type === 'EDIT').length,
      STREAM: done.filter((p) => p.content_type === 'STREAM').length,
    };
  },

  /** ROI trend — last N months: content counts per type */
  async getRoiTrend(months = 6): Promise<
    Array<{ month: string; label: string; voice: number; edit: number; stream: number; total: number }>
  > {
    const now = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
      const counts = await contentPlanService.getCountByType(m);
      result.push({
        month: m,
        label,
        voice: counts.VOICE,
        edit: counts.EDIT,
        stream: counts.STREAM,
        total: counts.VOICE + counts.EDIT + counts.STREAM,
      });
    }

    return result;
  },

  /** Per-user plan stats for a month */
  async getUserStats(month: string): Promise<
    Array<{ userId: string; name: string; planned: number; done: number; overdue: number }>
  > {
    const plans = await contentPlanService.getByMonth(month);
    const today = new Date().toISOString().slice(0, 10);
    const map = new Map<string, { userId: string; name: string; planned: number; done: number; overdue: number }>();

    for (const plan of plans) {
      if (!plan.assigned_to || !plan.assignee) continue;
      const existing = map.get(plan.assigned_to) ?? {
        userId: plan.assigned_to,
        name: plan.assignee.full_name,
        planned: 0,
        done: 0,
        overdue: 0,
      };
      if (plan.status === 'DONE') existing.done += 1;
      else {
        existing.planned += 1;
        if (plan.planned_date < today) existing.overdue += 1;
      }
      map.set(plan.assigned_to, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.planned - a.planned);
  },
};
