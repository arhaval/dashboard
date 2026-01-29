/**
 * Social Monthly Metrics Service
 * Handles CRUD and growth calculations for social media metrics
 */

import { createClient } from '@/lib/supabase/server';
import type {
  SocialMonthlyMetrics,
  CreateSocialMonthlyMetricsInput,
  MetricsPlatform,
  PlatformGrowth,
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
    const currentMonth = month || getCurrentMonth();
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
      const followers_growth = followers_current - followers_previous;
      const followers_growth_percent =
        followers_previous > 0
          ? ((followers_growth / followers_previous) * 100)
          : 0;

      const engagement_current = current ? getEngagement(current) : 0;
      const engagement_previous = previous ? getEngagement(previous) : 0;

      const views_current = current ? getViews(current) : 0;
      const views_previous = previous ? getViews(previous) : 0;

      growthData.push({
        platform,
        followers_current,
        followers_previous,
        followers_growth,
        followers_growth_percent: Math.round(followers_growth_percent * 100) / 100,
        engagement_current,
        engagement_previous,
        engagement_growth: engagement_current - engagement_previous,
        views_current,
        views_previous,
        views_growth: views_current - views_previous,
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

    // Total live views (Twitch + YouTube)
    const twitchData = growthData.find((g) => g.platform === 'TWITCH');
    const youtubeData = growthData.find((g) => g.platform === 'YOUTUBE');

    // Get actual live views from current month data
    const currentMonth = month || getCurrentMonth();
    const currentData = await this.getByMonth(currentMonth);
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
};
