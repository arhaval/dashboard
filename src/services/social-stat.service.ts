/**
 * Social Stat Service
 * Handles social media statistics CRUD operations
 */

import { createClient } from '@/lib/supabase/server';
import type { SocialStat, CreateSocialStatInput, SocialStatFilters, Platform } from '@/types';

export const socialStatService = {
  /**
   * Get all social stats with optional filters
   */
  async getAll(filters?: SocialStatFilters): Promise<SocialStat[]> {
    const supabase = await createClient();

    let query = supabase
      .from('social_stats_v1')
      .select('*')
      .order('date', { ascending: false });

    if (filters?.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters?.date_from) {
      query = query.gte('date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('date', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching social stats:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get social stat by ID
   */
  async getById(id: string): Promise<SocialStat | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_stats_v1')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching social stat:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Create a new social stat entry
   */
  async create(input: CreateSocialStatInput): Promise<{ stat: SocialStat | null; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_stats_v1')
      .insert({
        date: input.date,
        platform: input.platform,
        followers: input.followers,
        views: input.views,
        comments: input.comments,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating social stat:', error.message);
      return { stat: null, error: error.message };
    }

    return { stat: data };
  },

  /**
   * Update a social stat entry
   */
  async update(
    id: string,
    input: Partial<CreateSocialStatInput>
  ): Promise<{ stat: SocialStat | null; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_stats_v1')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating social stat:', error.message);
      return { stat: null, error: error.message };
    }

    return { stat: data };
  },

  /**
   * Delete a social stat entry
   */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('social_stats_v1')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting social stat:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Get summary stats by platform
   */
  async getSummary(): Promise<Record<Platform, { followers: number; views: number; comments: number }>> {
    const supabase = await createClient();

    // Get latest entry for each platform
    const platforms: Platform[] = ['twitch', 'youtube', 'instagram', 'x'];
    const summary: Record<Platform, { followers: number; views: number; comments: number }> = {
      twitch: { followers: 0, views: 0, comments: 0 },
      youtube: { followers: 0, views: 0, comments: 0 },
      instagram: { followers: 0, views: 0, comments: 0 },
      x: { followers: 0, views: 0, comments: 0 },
    };

    for (const platform of platforms) {
      const { data } = await supabase
        .from('social_stats_v1')
        .select('followers, views, comments')
        .eq('platform', platform)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        summary[platform] = {
          followers: data.followers,
          views: data.views,
          comments: data.comments,
        };
      }
    }

    return summary;
  },
};
