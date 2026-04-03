/**
 * Weekly Schedule Service — SERVER ONLY
 * Supabase CRUD işlemleri
 */

import { createClient } from '@/lib/supabase/server';
import type { DaySchedule, WeekActivity } from './weekly-schedule.utils';

export type { DaySchedule, WeekActivity } from './weekly-schedule.utils';
export {
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
  DAY_LABELS,
  DAY_SHORT,
  ALL_ACTIVITIES,
  formatScheduleForSharing,
} from './weekly-schedule.utils';

export const weeklyScheduleService = {
  async getAll(): Promise<DaySchedule[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('weekly_schedule')
      .select('*')
      .order('day_of_week');
    return (data ?? []) as DaySchedule[];
  },

  async updateDay(dayOfWeek: number, activities: WeekActivity[], notes?: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('weekly_schedule')
      .update({ activities, notes: notes ?? null, updated_at: new Date().toISOString() })
      .eq('day_of_week', dayOfWeek);
    return !error;
  },
};
