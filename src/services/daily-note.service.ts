/**
 * Günlük servisi — gün başına tek not sayfası.
 *
 * Admin istemcisi kullanılıyor ama her sorgu `author_id` ile sınırlı: not
 * kişinin kendi günlüğü, başkasının notu hiçbir koşulda dönmez. RLS de aynı
 * kuralı tutuyor; ikisi birbirinin yedeği.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface DailyNote {
  id: string;
  note_date: string;
  body: string;
  updated_at: string;
}

/** Migration uygulanmadığında sayfa çökmesin diye ayırt edilen durum. */
export interface DailyNoteResult<T> {
  data: T;
  /** Tablo henüz yoksa doldurulur. */
  missingTable?: boolean;
  error?: string;
}

const MISSING_TABLE = /relation .*daily_notes.* does not exist|Could not find the table/i;

function isMissingTable(message: string): boolean {
  return MISSING_TABLE.test(message);
}

export const dailyNoteService = {
  /** Bir kişinin bütün günleri, en yeniden eskiye. */
  async list(authorId: string): Promise<DailyNoteResult<DailyNote[]>> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('daily_notes')
      .select('id, note_date, body, updated_at')
      .eq('author_id', authorId)
      .order('note_date', { ascending: false });

    if (error) {
      return isMissingTable(error.message)
        ? { data: [], missingTable: true }
        : { data: [], error: error.message };
    }
    return { data: (data ?? []) as DailyNote[] };
  },

  /**
   * Bir günün sayfasını yazar.
   *
   * Aynı güne ikinci kayıt açılmaz: (note_date, author_id) tekil, çakışmada
   * mevcut sayfa güncellenir. Boş gövde silmek demek — gün sayfasını
   * temizleyince listede boş satır kalmasın.
   */
  async save(authorId: string, noteDate: string, body: string): Promise<{ error?: string }> {
    const admin = createAdminClient();

    if (!body.trim()) {
      const { error } = await admin
        .from('daily_notes')
        .delete()
        .eq('author_id', authorId)
        .eq('note_date', noteDate);
      if (error && !isMissingTable(error.message)) return { error: error.message };
      return {};
    }

    const { error } = await admin.from('daily_notes').upsert(
      {
        author_id: authorId,
        note_date: noteDate,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'note_date,author_id' }
    );
    if (error) {
      return isMissingTable(error.message)
        ? { error: 'Veritabanı güncellemesi bekliyor: 20261020_daily_notes.sql' }
        : { error: error.message };
    }
    return {};
  },
};
