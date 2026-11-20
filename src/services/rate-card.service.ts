/**
 * Rate Card Service
 * Kişi × müşteri × iş türü (× uzunluk) başına fiyat. Fiyat bilgisi hassastır:
 * çalışan yalnızca kendi fiyatını görebilir (RLS). Yönetim admin'e aittir.
 *
 * resolveRate: iş girişinde doğru fiyatı sunucu tarafında çözer. Önce tam
 * uzunluk eşleşmesi, yoksa uzunluğu NULL (her uzunluk) olan kart kullanılır.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  RateCard,
  UpsertRateCardInput,
  ResolvedRate,
  WorkType,
  ContentLength,
} from '@/types';

export const rateCardService = {
  /** Admin: tüm fiyat kartları, kişi + müşteri bilgisiyle. */
  async getAll(): Promise<RateCard[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rate_cards')
      .select('*, user:users(id, full_name, avatar_url), client:clients(id, name, is_internal)')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching rate cards:', error.message);
      return [];
    }
    return data ?? [];
  },

  /** Belirli bir kişinin fiyat kartları (admin görünümü veya kişinin kendisi). */
  async getByUser(userId: string): Promise<RateCard[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rate_cards')
      .select('*, client:clients(id, name, is_internal)')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) return [];
    return data ?? [];
  },

  /**
   * Fiyat kartı ekle/güncelle. Aynı (kişi, müşteri, iş türü, uzunluk) varsa
   * günceller — benzersiz indeks üzerinden upsert.
   */
  async upsert(input: UpsertRateCardInput): Promise<RateCard | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rate_cards')
      .upsert(
        {
          user_id: input.user_id,
          client_id: input.client_id,
          work_type: input.work_type,
          content_length: input.content_length ?? null,
          map_count: input.map_count ?? null,
          pay_amount: input.pay_amount,
          bill_amount: input.bill_amount ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,client_id,work_type,content_length,map_count' }
      )
      .select()
      .single();
    if (error) {
      console.error('Error upserting rate card:', error.message);
      return null;
    }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from('rate_cards').delete().eq('id', id);
    if (error) {
      console.error('Error deleting rate card:', error.message);
      return false;
    }
    return true;
  },

  /**
   * İş girişinde fiyatı çöz. Tam uzunluk eşleşmesi önceliklidir; yoksa
   * uzunluğu NULL (her uzunluk) kart kullanılır. Eşleşme yoksa null döner
   * (fiyat elle girilecek / admin onayında belirlenecek).
   */
  async resolveRate(
    userId: string,
    clientId: string,
    workType: WorkType,
    opts: { contentLength?: ContentLength | null; mapCount?: number | null }
  ): Promise<ResolvedRate | null> {
    const supabase = await createClient();

    const { data: client } = await supabase
      .from('clients')
      .select('is_internal')
      .eq('id', clientId)
      .single();
    const isInternal = client?.is_internal ?? true;

    const { data: cards } = await supabase
      .from('rate_cards')
      .select('id, content_length, map_count, pay_amount, bill_amount')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('work_type', workType)
      .eq('is_active', true);

    if (!cards || cards.length === 0) return null;

    // Yayın → fiyat HARİTA BAŞINA; toplam = harita başı × harita sayısı.
    // Diğerleri → uzunluğa göre eşleşen tek fiyat.
    let match: (typeof cards)[number] | null;
    let multiplier = 1;
    if (workType === 'STREAM') {
      // Yayın fiyatı tek: (kişi, müşteri, Yayın) → harita başı ücret.
      match = cards.find((c) => c.content_length === null) ?? cards[0] ?? null;
      const mc = opts.mapCount ?? null;
      multiplier = mc && mc > 0 ? mc : 1;
    } else {
      const len = opts.contentLength ?? null;
      const exact = len ? cards.find((c) => c.content_length === len) : undefined;
      const anyLength = cards.find((c) => c.content_length === null);
      match = exact ?? anyLength ?? null;
    }
    if (!match) return null;

    return {
      pay_amount: Number(match.pay_amount) * multiplier,
      bill_amount: match.bill_amount != null ? Number(match.bill_amount) * multiplier : null,
      is_internal: isInternal,
      rate_card_id: match.id,
    };
  },
};
