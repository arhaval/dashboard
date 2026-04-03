/**
 * Content Goal Service
 * Haftalık içerik hedefi yönetimi
 * Platform + alt tür bazlı hedef takibi
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ContentGoal,
  ContentPlatform,
  ContentSubtype,
  WeeklyGoalProgress,
} from '@/types';

// ISO week start (Monday) for a given date
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export const contentGoalService = {
  /** Get all active goals */
  async getAll(): Promise<ContentGoal[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('content_goals')
      .select('*')
      .order('platform')
      .order('sub_type');
    return (data ?? []) as ContentGoal[];
  },

  /** Update a goal's weekly target */
  async updateTarget(id: string, weekly_target: number): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('content_goals')
      .update({ weekly_target, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  },

  /**
   * Get weekly progress for the current (or given) week.
   * Counts DONE content_plans that have platform + content_subtype set.
   */
  async getWeeklyProgress(weekOf?: Date): Promise<WeeklyGoalProgress[]> {
    const supabase = await createClient();
    const weekStart = getWeekStart(weekOf ?? new Date());
    const weekEnd = getWeekEnd(weekStart);

    const [goalsRes, plansRes] = await Promise.all([
      supabase.from('content_goals').select('*').eq('is_active', true),
      supabase
        .from('content_plans')
        .select('platform, content_subtype, status')
        .eq('status', 'DONE')
        .gte('planned_date', weekStart)
        .lte('planned_date', weekEnd)
        .not('platform', 'is', null)
        .not('content_subtype', 'is', null),
    ]);

    const goals = (goalsRes.data ?? []) as ContentGoal[];
    const plans = plansRes.data ?? [];

    return goals.map((goal) => {
      const done = plans.filter(
        (p) => p.platform === goal.platform && p.content_subtype === goal.sub_type
      ).length;

      const pct =
        goal.weekly_target > 0 ? Math.min(Math.round((done / goal.weekly_target) * 100), 100) : 0;

      return {
        platform: goal.platform,
        sub_type: goal.sub_type,
        weekly_target: goal.weekly_target,
        done_this_week: done,
        pct,
        on_track: done >= goal.weekly_target && goal.weekly_target > 0,
      };
    });
  },

  /**
   * Get weekly progress for the last N weeks (for trend).
   */
  async getWeeklyTrend(
    weeks = 8
  ): Promise<Array<{ weekLabel: string; weekStart: string; items: WeeklyGoalProgress[] }>> {
    const result = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const weekStart = getWeekStart(d);
      const weekOf = new Date(weekStart);
      const items = await contentGoalService.getWeeklyProgress(weekOf);

      // label: "31 Mar - 6 Nis"
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      const weekLabel = `${weekOf.getDate()} ${weekOf.toLocaleDateString('tr-TR', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('tr-TR', { month: 'short' })}`;

      result.push({ weekLabel, weekStart, items });
    }

    return result;
  },

  /** Get current week date range as label */
  getCurrentWeekLabel(): string {
    const start = new Date(getWeekStart(new Date()));
    const end = new Date(getWeekEnd(getWeekStart(new Date())));
    return `${start.getDate()} ${start.toLocaleDateString('tr-TR', { month: 'long' })} – ${end.getDate()} ${end.toLocaleDateString('tr-TR', { month: 'long' })}`;
  },
};
