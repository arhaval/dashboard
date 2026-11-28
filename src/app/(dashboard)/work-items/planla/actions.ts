/**
 * Planlı yayın — Server Actions (admin-only)
 * Admin yaklaşan yayını yayıncıya atar; yayıncı yayından sonra "Yayını gir"
 * ile işi önceden dolu formla girer.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { contentPlanService } from '@/services/content-plan.service';
import { notificationService } from '@/services/notification.service';

interface ActionResult {
  success: boolean;
  error?: string;
}

const planSchema = z.object({
  title: z.string().trim().min(1, 'Maç adı zorunlu'),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih zorunlu'),
  assigned_to: z.string().uuid('Yayıncı seçin'),
  client_id: z.string().uuid().nullable(),
});

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data?.role === 'ADMIN' ? user.id : null;
}

function revalidate() {
  revalidatePath('/work-items/planla');
  revalidatePath('/');
}

export async function createStreamPlan(input: z.input<typeof planSchema>): Promise<ActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { success: false, error: 'Yetkisiz' };

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' };

  const created = await contentPlanService.create(
    { ...parsed.data, content_type: 'STREAM' },
    adminId
  );
  if (!created) return { success: false, error: 'Plan eklenemedi.' };

  // Yayıncıya haber ver — planı ana sayfasında görmeyi beklemesin.
  const [y, m, d] = parsed.data.planned_date.split('-');
  await notificationService.notify({
    userIds: [parsed.data.assigned_to],
    title: '📅 Yeni yayın planı',
    body: `${parsed.data.title} · ${d}.${m}.${y}. Yayından sonra "Yayını gir" ile kaydet.`,
    url: '/',
    tag: `plan-${created.id}`,
  });

  revalidate();
  return { success: true };
}

export async function cancelStreamPlan(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { success: false, error: 'Yetkisiz' };
  const ok = await contentPlanService.updateStatus(id, 'CANCELLED');
  if (!ok) return { success: false, error: 'İptal edilemedi.' };
  revalidate();
  return { success: true };
}
