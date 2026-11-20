/**
 * Client / Partner Service
 * Müşteri ve iş ortaklarının yönetimi. Okuma herkese açık (iş girişinde seçim
 * için), yazma admin (RLS ile zorlanır).
 */

import { createClient } from '@/lib/supabase/server';
import type { Client, CreateClientInput, UpdateClientInput } from '@/types';

export const clientService = {
  /** Tüm aktif müşteriler; iç müşteri (Arhaval) önce gelir. */
  async getAll(includeInactive = false): Promise<Client[]> {
    const supabase = await createClient();
    let query = supabase
      .from('clients')
      .select('*')
      .order('is_internal', { ascending: false })
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching clients:', error.message);
      return [];
    }
    return data ?? [];
  },

  async getById(id: string): Promise<Client | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  /** Varsayılan iç müşteri (Arhaval). İş ortağı seçilmeyen işler buna bağlanır. */
  async getInternalDefault(): Promise<Client | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('is_internal', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  },

  async create(input: CreateClientInput): Promise<Client | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: input.name,
        is_internal: input.is_internal ?? false,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) {
      console.error('Error creating client:', error.message);
      return null;
    }
    return data;
  },

  async update(id: string, updates: UpdateClientInput): Promise<Client | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating client:', error.message);
      return null;
    }
    return data;
  },
};
