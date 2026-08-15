'use server';

/**
 * Eksik veri tamamlama akışının kaydetme ucu.
 *
 * Neden ayrı bir aksiyon: mevcut `upsertSocialMetrics` TAM bir girdi bekler ve
 * `followers_total` zorunlu. Sihirbaz yalnızca EKSİK alanları gönderdiği için
 * o yolu kullanmak, sorulmayan alanları (örn. dolu olan takipçi sayısını)
 * sıfırla ezerdi.
 *
 * Buradaki kayıt KISMİ: yalnızca gelen alanlar yazılır. Alan adları o
 * platformun tanımlı alanlarıyla doğrulanır — istemciden gelen isimle
 * rastgele kolona yazılamaz.
 */

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  expectedFields,
  toStoredValue,
  MONTHLY_PLATFORMS,
  type MonthlyPlatform,
} from '../social-monthly.constants';

export interface SaveResult {
  success: boolean;
  error?: string;
  /** Kaydedilen alan sayısı. */
  saved?: number;
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function saveMissingMetrics(
  month: string,
  platform: string,
  values: Record<string, string>
): Promise<SaveResult> {
  const user = await userService.getCurrentUser();
  if (!user) return { success: false, error: 'Oturum gerekli' };
  if (user.role !== 'ADMIN') return { success: false, error: 'Yetki yok' };

  if (!MONTH_PATTERN.test(month)) return { success: false, error: 'Ay formatı YYYY-MM olmalı' };
  if (!MONTHLY_PLATFORMS.includes(platform as MonthlyPlatform)) {
    return { success: false, error: 'Geçersiz platform' };
  }

  // Yalnızca bu platformun tanımlı alanları yazılabilir.
  const fields = expectedFields(platform as MonthlyPlatform);
  const byName = new Map(fields.map((f) => [f.name, f]));

  const payload: Record<string, number> = {};
  for (const [key, raw] of Object.entries(values)) {
    const field = byName.get(key);
    if (!field) continue;
    const text = String(raw ?? '').trim();
    if (text === '') continue; // boş bırakılan alan "şimdilik yok" demek
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0) {
      return { success: false, error: `${field.label} için geçerli bir sayı gir` };
    }
    // Birim çevrimi TEK yerde ve SUNUCUDA: yayın süresi saat girilir, dakika
    // saklanır. İstemcide yapılsaydı başka bir giriş yolu atlayabilirdi.
    payload[key] = toStoredValue(field, n);
  }

  if (Object.keys(payload).length === 0) return { success: true, saved: 0 };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('social_monthly_metrics')
    .select('id')
    .eq('month', month)
    .eq('platform', platform)
    .maybeSingle();

  const stamped = { ...payload, updated_at: new Date().toISOString() };

  const { error } = existing
    ? await admin.from('social_monthly_metrics').update(stamped).eq('id', (existing as { id: string }).id)
    // İlk kayıtta followers_total NOT NULL — gelmemişse 0 ile açılır, doldurulduğunda güncellenir.
    : await admin.from('social_monthly_metrics').insert({ month, platform, followers_total: 0, ...stamped });

  if (error) return { success: false, error: error.message };

  revalidatePath('/social');
  revalidatePath('/social/data');
  revalidatePath('/social/analytics');
  return { success: true, saved: Object.keys(payload).length };
}
