import { createClient } from '@/lib/supabase/server';

export type ContentPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TWITCH' | 'X';
export type ContentStatus = 'HAZIRLANIYOR' | 'HAZIR' | 'YAYINLANDI';

export interface ContentQueueItem {
  id: string;
  title: string;
  platform: ContentPlatform;
  content_type: string;
  status: ContentStatus;
  planned_date: string | null;
  published_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentQueueInput {
  title: string;
  platform: ContentPlatform;
  content_type: string;
  status?: ContentStatus;
  planned_date?: string | null;
  notes?: string | null;
  created_by: string;
}

export interface UpdateContentQueueInput {
  title?: string;
  platform?: ContentPlatform;
  content_type?: string;
  status?: ContentStatus;
  planned_date?: string | null;
  published_date?: string | null;
  notes?: string | null;
}

export const CONTENT_TYPES: Record<ContentPlatform, string[]> = {
  YOUTUBE:   ['Video', 'Short', 'Canlı'],
  INSTAGRAM: ['Reels', 'Gönderi', 'Hikaye', 'Canlı'],
  TWITCH:    ['Yayın', 'Klip'],
  X:         ['Tweet', 'Thread'],
};

export const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  YOUTUBE:   'YouTube',
  INSTAGRAM: 'Instagram',
  TWITCH:    'Twitch',
  X:         'X (Twitter)',
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  HAZIRLANIYOR: 'Hazırlanıyor',
  HAZIR:        'Hazır',
  YAYINLANDI:   'Yayınlandı',
};

export const contentQueueService = {
  async getAll(filters?: {
    platform?: ContentPlatform;
    status?: ContentStatus;
  }): Promise<ContentQueueItem[]> {
    const supabase = await createClient();

    let query = supabase
      .from('content_queue')
      .select('*')
      .order('planned_date', { ascending: true, nullsFirst: false });

    if (filters?.platform) query = query.eq('platform', filters.platform);
    if (filters?.status)   query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) {
      console.error('content_queue getAll error:', error.message);
      return [];
    }
    return data || [];
  },

  async create(
    input: CreateContentQueueInput
  ): Promise<{ item: ContentQueueItem | null; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('content_queue')
      .insert(input)
      .select()
      .single();

    if (error) return { item: null, error: error.message };
    return { item: data };
  },

  async update(
    id: string,
    input: UpdateContentQueueInput
  ): Promise<{ item: ContentQueueItem | null; error?: string }> {
    const supabase = await createClient();

    const payload: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    // Yayınlandı yapılırken tarihi otomatik ata
    if (input.status === 'YAYINLANDI' && !input.published_date) {
      payload.published_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('content_queue')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { item: null, error: error.message };
    return { item: data };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('content_queue')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
