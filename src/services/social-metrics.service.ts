/**
 * Social Monthly Metrics Service
 * Handles CRUD and growth calculations for social media metrics
 */

import { createClient } from '@/lib/supabase/server';
import { GOAL_METRICS_BY_PLATFORM } from '@/constants';
import type {
  SocialMonthlyMetrics,
  CreateSocialMonthlyMetricsInput,
  MetricsPlatform,
  PlatformGrowth,
  SocialMonthlyNote,
  SocialGoal,
  CreateSocialGoalInput,
  GoalProgress,
} from '@/types';

// Helper to get previous month in YYYY-MM format
function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 2, 1); // monthNum - 1 for 0-index, -1 for previous
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Helper to get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Helper to calculate engagement based on platform
function getEngagement(metrics: SocialMonthlyMetrics): number {
  switch (metrics.platform) {
    case 'TWITCH':
      return (metrics.unique_chatters || 0) + (metrics.subs_total || 0);
    case 'YOUTUBE':
      return (metrics.total_likes || 0) + (metrics.total_comments || 0);
    case 'INSTAGRAM':
      return (
        (metrics.likes || 0) +
        (metrics.comments || 0) +
        (metrics.saves || 0) +
        (metrics.shares || 0)
      );
    case 'X':
      return (metrics.likes || 0) + (metrics.replies || 0);
    default:
      return 0;
  }
}

// Helper to get views based on platform
function getViews(metrics: SocialMonthlyMetrics): number {
  switch (metrics.platform) {
    case 'TWITCH':
      return metrics.live_views || 0;
    case 'YOUTUBE':
      return (
        (metrics.video_views || 0) +
        (metrics.shorts_views || 0) +
        (metrics.live_views || 0)
      );
    case 'INSTAGRAM':
      return metrics.views || 0;
    case 'X':
      return metrics.impressions || 0;
    default:
      return 0;
  }
}

export const socialMetricsService = {
  /**
   * Get all metrics for a specific month
   */
  async getByMonth(month: string): Promise<SocialMonthlyMetrics[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_monthly_metrics')
      .select('*')
      .eq('month', month)
      .order('platform');

    if (error) {
      console.error('Error fetching metrics by month:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get all metrics for a specific platform (history)
   */
  async getByPlatform(platform: MetricsPlatform): Promise<SocialMonthlyMetrics[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_monthly_metrics')
      .select('*')
      .eq('platform', platform)
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching metrics by platform:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get a single metric record
   */
  async getByMonthAndPlatform(
    month: string,
    platform: MetricsPlatform
  ): Promise<SocialMonthlyMetrics | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_monthly_metrics')
      .select('*')
      .eq('month', month)
      .eq('platform', platform)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching metric:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Create or update metrics for a month/platform
   */
  async upsert(
    input: CreateSocialMonthlyMetricsInput
  ): Promise<{ metrics: SocialMonthlyMetrics | null; error?: string }> {
    const supabase = await createClient();

    // Check if record exists
    const existing = await this.getByMonthAndPlatform(input.month, input.platform);

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('social_monthly_metrics')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating metrics:', error.message);
        return { metrics: null, error: error.message };
      }

      return { metrics: data };
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('social_monthly_metrics')
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error('Error creating metrics:', error.message);
        return { metrics: null, error: error.message };
      }

      return { metrics: data };
    }
  },

  /**
   * Delete metrics record
   */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('social_monthly_metrics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting metrics:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Get growth data for all platforms
   */
  async getGrowthData(month?: string): Promise<PlatformGrowth[]> {
    // If no month specified, use the most recent month with data (not necessarily current month)
    let currentMonth = month || getCurrentMonth();
    if (!month) {
      const availableMonths = await this.getAvailableMonths();
      if (availableMonths.length > 0) {
        currentMonth = availableMonths[0]; // Most recent month with data
      }
    }
    const previousMonth = getPreviousMonth(currentMonth);

    const [currentData, previousData] = await Promise.all([
      this.getByMonth(currentMonth),
      this.getByMonth(previousMonth),
    ]);

    const platforms: MetricsPlatform[] = ['TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X'];
    const growthData: PlatformGrowth[] = [];

    for (const platform of platforms) {
      const current = currentData.find((m) => m.platform === platform);
      const previous = previousData.find((m) => m.platform === platform);

      const followers_current = current?.followers_total || 0;
      const followers_previous = previous?.followers_total || 0;

      // If no previous data exists, growth should be 0 (first record)
      const isFirstRecord = !previous && !!current;
      const followers_growth = isFirstRecord ? 0 : (followers_current - followers_previous);
      const followers_growth_percent =
        followers_previous > 0
          ? ((followers_growth / followers_previous) * 100)
          : 0;

      const engagement_current = current ? getEngagement(current) : 0;
      const engagement_previous = previous ? getEngagement(previous) : 0;

      const views_current = current ? getViews(current) : 0;
      const views_previous = previous ? getViews(previous) : 0;

      // If first record, set growth to 0
      const engagement_growth = isFirstRecord ? 0 : (engagement_current - engagement_previous);
      const views_growth = isFirstRecord ? 0 : (views_current - views_previous);

      growthData.push({
        platform,
        followers_current,
        followers_previous,
        followers_growth,
        followers_growth_percent: Math.round(followers_growth_percent * 100) / 100,
        engagement_current,
        engagement_previous,
        engagement_growth,
        views_current,
        views_previous,
        views_growth,
        isFirstRecord: isFirstRecord || false,
      });
    }

    return growthData;
  },

  /**
   * Get dashboard summary for current month
   */
  async getDashboardSummary(month?: string): Promise<{
    totalLiveViews: number;
    totalFollowersGrowth: number;
    totalEngagement: number;
    platformCount: number;
  }> {
    const growthData = await this.getGrowthData(month);

    // Use the most recent month with data
    let activeMonth = month || getCurrentMonth();
    if (!month) {
      const availableMonths = await this.getAvailableMonths();
      if (availableMonths.length > 0) {
        activeMonth = availableMonths[0];
      }
    }

    // Get actual live views from active month data
    const currentData = await this.getByMonth(activeMonth);
    const twitchMetrics = currentData.find((m) => m.platform === 'TWITCH');
    const youtubeMetrics = currentData.find((m) => m.platform === 'YOUTUBE');

    const totalLiveViews =
      (twitchMetrics?.live_views || 0) + (youtubeMetrics?.live_views || 0);

    // Total followers growth
    const totalFollowersGrowth = growthData.reduce(
      (sum, g) => sum + g.followers_growth,
      0
    );

    // Total engagement
    const totalEngagement = growthData.reduce(
      (sum, g) => sum + g.engagement_current,
      0
    );

    // Count platforms with data
    const platformCount = currentData.length;

    return {
      totalLiveViews,
      totalFollowersGrowth,
      totalEngagement,
      platformCount,
    };
  },

  /**
   * Get all months with data
   */
  async getAvailableMonths(): Promise<string[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_monthly_metrics')
      .select('month')
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching months:', error.message);
      return [];
    }

    // Get unique months
    const months = [...new Set(data?.map((d) => d.month) || [])];
    return months;
  },

  // =========================================================================
  // Trend Data
  // =========================================================================

  /**
   * Get metrics for last N months across all platforms (for trend charts)
   */
  async getTrendData(): Promise<SocialMonthlyMetrics[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_monthly_metrics')
      .select('*')
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching trend data:', error.message);
      return [];
    }

    return data || [];
  },

  // =========================================================================
  // Monthly Notes
  // =========================================================================

  /**
   * Get note for a specific month
   */
  async getNoteForMonth(month: string): Promise<SocialMonthlyNote | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_monthly_notes')
      .select('*')
      .eq('month', month)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching note:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Create or update monthly note
   */
  async upsertNote(month: string, notes: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const existing = await this.getNoteForMonth(month);

    if (existing) {
      const { error } = await supabase
        .from('social_monthly_notes')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating note:', error.message);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('social_monthly_notes')
        .insert({ month, notes });

      if (error) {
        console.error('Error creating note:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  },

  // =========================================================================
  // Goals
  // =========================================================================

  /**
   * Get all goals for a specific month
   */
  async getGoalsByMonth(month: string): Promise<SocialGoal[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_goals')
      .select('*')
      .eq('month', month)
      .order('platform');

    if (error) {
      console.error('Error fetching goals:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Create or update a goal
   */
  async upsertGoal(input: CreateSocialGoalInput): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('social_goals')
      .select('id')
      .eq('month', input.month)
      .eq('platform', input.platform)
      .eq('metric_key', input.metric_key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('social_goals')
        .update({ target_value: input.target_value, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('social_goals')
        .insert(input);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  },

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('social_goals')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Get goal progress for a specific month (goals + actual values)
   */
  async getGoalProgress(month: string): Promise<GoalProgress[]> {
    const [goals, metrics] = await Promise.all([
      this.getGoalsByMonth(month),
      this.getByMonth(month),
    ]);

    if (goals.length === 0) return [];

    return goals.map((goal) => {
      const metric = metrics.find((m) => m.platform === goal.platform);
      const actual = metric
        ? (metric[goal.metric_key as keyof SocialMonthlyMetrics] as number) || 0
        : 0;

      const percentage = goal.target_value > 0
        ? Math.round((actual / goal.target_value) * 100)
        : 0;

      // Find label from constants
      const platformMetrics = GOAL_METRICS_BY_PLATFORM[goal.platform];
      const metricDef = platformMetrics?.find((m) => m.key === goal.metric_key);

      return {
        platform: goal.platform,
        metric_key: goal.metric_key,
        metric_label: metricDef?.label || goal.metric_key,
        target: goal.target_value,
        actual,
        percentage,
      };
    });
  },
};
