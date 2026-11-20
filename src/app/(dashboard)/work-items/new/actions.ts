/**
 * Work Item Creation — Server Action
 *
 * İş girişi herkesin (çalışan + admin) yaptığı bir işlem. Fiyat bilgisi hassas
 * olduğu için fiyat çözümlemesi ve cost/bill_amount atama SUNUCUDA yapılır —
 * istemci başkalarının fiyatını göremez, kendi ücretini de elle değiştiremez.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { clientService } from '@/services/client.service';
import { rateCardService } from '@/services/rate-card.service';
import type { CreateWorkItemInput } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createWorkItem(input: CreateWorkItemInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Giriş yapmanız gerekiyor.' };
  }

  // Sunucu tarafı doğrulama (istemciye güvenmiyoruz)
  if (!input.work_date) {
    return { success: false, error: 'İş tarihi zorunlu.' };
  }
  if (input.work_type === 'STREAM') {
    if (!input.match_name?.trim()) return { success: false, error: 'Maç adı zorunlu.' };
    if (!input.duration_minutes || input.duration_minutes < 1)
      return { success: false, error: 'Süre zorunlu.' };
  } else {
    if (!input.content_name?.trim()) return { success: false, error: 'İçerik adı zorunlu.' };
    if (!input.content_length) return { success: false, error: 'İçerik uzunluğu zorunlu.' };
  }

  // Müşteri: seçilmemişse varsayılan iç müşteri (Arhaval)
  let clientId = input.client_id ?? null;
  if (!clientId) {
    const def = await clientService.getInternalDefault();
    clientId = def?.id ?? null;
  }

  // Fiyatı sunucuda çöz — tanımlı değilse null kalır, admin onayda belirler.
  let cost: number | null = null;
  let billAmount: number | null = null;
  if (clientId) {
    const resolved = await rateCardService.resolveRate(user.id, clientId, input.work_type, {
      contentLength: input.content_length ?? null,
      mapCount: input.map_count ?? null,
    });
    if (resolved) {
      cost = resolved.pay_amount;
      billAmount = resolved.is_internal ? null : resolved.bill_amount;
    }
  }

  // Admin istemci ile insert: çözülen fiyat kesin kaynaktır, RLS'e takılmaz.
  const admin = createAdminClient();
  const { error } = await admin.from('work_items').insert({
    user_id: user.id,
    work_type: input.work_type,
    work_date: input.work_date,
    notes: input.notes || null,
    match_name: input.work_type === 'STREAM' ? input.match_name || null : null,
    duration_minutes: input.work_type === 'STREAM' ? input.duration_minutes || null : null,
    content_name: input.work_type !== 'STREAM' ? input.content_name || null : null,
    content_length: input.work_type !== 'STREAM' ? input.content_length || null : null,
    map_count: input.work_type === 'STREAM' ? input.map_count ?? null : null,
    client_id: clientId,
    cost,
    bill_amount: billAmount,
    status: 'DRAFT',
  });

  if (error) {
    console.error('Error creating work item:', error.message);
    return { success: false, error: 'İş kaydı oluşturulamadı.' };
  }

  revalidatePath('/work-items');
  revalidatePath('/');
  return { success: true };
}
