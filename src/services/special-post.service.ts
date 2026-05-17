/**
 * Special Post Service — İçerik Fikir Havuzu
 * CRUD + durum yönetimi + performans güncellemesi
 */

import { createClient } from '@/lib/supabase/server';
import type {
  SpecialPost,
  CreateSpecialPostInput,
  UpdateSpecialPostInput,
  SpecialPostFilters,
} from '@/types';

const SELECT_WITH_USERS = `
  *,
  author:users!special_posts_author_id_fkey(id, full_name, avatar_url),
  editor:users!special_posts_editor_id_fkey(id, full_name, avatar_url),
  designer:users!special_posts_designer_id_fkey(id, full_name, avatar_url)
`;

export const specialPostService = {
  /**
   * Tüm gönderileri listele (RLS otomatik filtreler)
   */
  async getAll(filters?: SpecialPostFilters): Promise<SpecialPost[]> {
    const supabase = await createClient();

    let query = supabase
      .from('special_posts')
      .select(SELECT_WITH_USERS)
      .order('created_at', { ascending: false });

    if (filters?.status)    query = query.eq('status', filters.status);
    if (filters?.author_id) query = query.eq('author_id', filters.author_id);
    if (filters?.platform)  query = query.contains('platforms', [filters.platform]);

    const { data, error } = await query;
    if (error) { console.error('specialPostService.getAll:', error.message); return []; }
    return (data as SpecialPost[]) || [];
  },

  /**
   * Tek gönderi getir
   */
  async getById(id: string): Promise<SpecialPost | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('special_posts')
      .select(SELECT_WITH_USERS)
      .eq('id', id)
      .single();

    if (error) { console.error('specialPostService.getById:', error.message); return null; }
    return data as SpecialPost;
  },

  /**
   * Yeni gönderi oluştur
   */
  async create(
    input: CreateSpecialPostInput,
    authorId: string,
  ): Promise<{ post: SpecialPost | null; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('special_posts')
      .insert({
        title:        input.title,
        platforms:    input.platforms,
        content_type: input.content_type,
        caption:      input.caption ?? null,
        author_id:    authorId,
        status:       'ONAY_BEKLIYOR',
      })
      .select(SELECT_WITH_USERS)
      .single();

    if (error) return { post: null, error: error.message };
    return { post: data as SpecialPost };
  },

  /**
   * Gönderiyi güncelle (durum, editör, tasarımcı, performans)
   */
  async update(
    id: string,
    input: UpdateSpecialPostInput,
  ): Promise<{ post: SpecialPost | null; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('special_posts')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_WITH_USERS)
      .single();

    if (error) return { post: null, error: error.message };
    return { post: data as SpecialPost };
  },

  /**
   * Durumu değiştir (admin)
   */
  async updateStatus(
    id: string,
    status: SpecialPost['status'],
  ): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('special_posts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    return {};
  },

  /**
   * Sil (admin only — RLS enforce eder)
   */
  async delete(id: string): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('special_posts')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return {};
  },

  /**
   * Durum bazlı sayılar (dashboard özet kartı için)
   */
  async getCounts(): Promise<Record<string, number>> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('special_posts')
      .select('status');

    if (error || !data) return {};

    return data.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
  },
};
