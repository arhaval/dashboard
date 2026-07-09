import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  deriveStage,
  ROLE_STAGES,
  STAGE_LABELS_MAP,
  type ContentPlatform,
  type ContentStatus,
  type ContentQueueItem,
  type ContentStage,
  type CreateContentQueueInput,
  type UpdateContentQueueInput,
} from '@/app/(dashboard)/icerik-plani/content-queue.constants';

export type { ContentPlatform, ContentStatus, ContentQueueItem, CreateContentQueueInput, UpdateContentQueueInput };

/** A content item surfaced on a member's profile, with its current stage. */
export interface AssignedContent extends ContentQueueItem {
  stage: ContentStage;
  stage_label: string;
}

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

    if (filters?.platform) query = query.contains('platforms', [filters.platform]);
    if (filters?.status)   query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) {
      console.error('content_queue getAll error:', error.message);
      return [];
    }
    return (data || []) as ContentQueueItem[];
  },

  /**
   * Content items whose CURRENT pipeline stage is the responsibility of `role`
   * (Metin→PUBLISHER, Ses→VOICE, Editörde→EDITOR). Surfaced on member profiles.
   * Uses the admin client so non-admin roles (VOICE/EDITOR) can be shown their
   * queue on a page that already gates access to admin-or-self.
   */
  async getAssignedForRole(role: string): Promise<AssignedContent[]> {
    const stages = ROLE_STAGES[role];
    if (!stages) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('content_queue')
      .select('*')
      .neq('status', 'YAYINLANDI')
      .order('planned_date', { ascending: true, nullsFirst: false });
    if (error || !data) return [];

    return (data as ContentQueueItem[])
      .map((i) => ({ ...i, stage: deriveStage(i) }))
      .filter((i) => stages.includes(i.stage))
      .map((i) => ({ ...i, stage_label: STAGE_LABELS_MAP[i.stage] }));
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
    return { item: data as ContentQueueItem };
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
    return { item: data as ContentQueueItem };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase.from('content_queue').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
