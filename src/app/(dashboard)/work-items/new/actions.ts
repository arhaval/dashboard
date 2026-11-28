/**
 * Work Item — Server Actions (oluştur / önizle / kendi taslağını düzenle-sil)
 *
 * İş girişi herkesin (çalışan + admin) yaptığı bir işlem. Fiyat bilgisi hassas
 * olduğu için fiyat çözümlemesi ve cost/bill_amount atama SUNUCUDA yapılır —
 * istemci başkalarının fiyatını göremez, kendi ücretini de elle değiştiremez.
 *
 * Çalışan kendi işini yalnızca TASLAK (DRAFT) iken düzeltebilir/silebilir;
 * admin onayladıktan sonra kayıt kilitlenir.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { clientService } from '@/services/client.service';
import { rateCardService } from '@/services/rate-card.service';
import { contentPlanService } from '@/services/content-plan.service';
import { notificationService } from '@/services/notification.service';
import type { CreateWorkItemInput, WorkType } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Doğrulama — oluşturma ve düzenleme aynı şemayı kullanır
// ---------------------------------------------------------------------------

const workItemSchema = z
  .object({
    work_type: z.enum(['STREAM', 'VOICE', 'EDIT']),
    work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'İş tarihi zorunlu.'),
    notes: z.string().max(2000).optional().nullable(),
    // Firma zorunlu: yanlış firmaya düşen iş yanlış ücret + yanlış rapor demek.
    client_id: z.string({ message: 'Kimin için yaptığını seç.' }).uuid('Kimin için yaptığını seç.'),
    match_name: z.string().trim().optional().nullable(),
    duration_minutes: z.number().int().optional().nullable(),
    map_count: z.number().int().min(1, 'Harita sayısı en az 1.').max(9).optional().nullable(),
    content_name: z.string().trim().optional().nullable(),
    content_length: z.enum(['SHORT', 'LONG']).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.work_type === 'STREAM') {
      if (!v.match_name) ctx.addIssue({ code: 'custom', message: 'Maç adı zorunlu.' });
      if (!v.duration_minutes || v.duration_minutes < 1)
        ctx.addIssue({ code: 'custom', message: 'Süre zorunlu.' });
      if (!v.map_count) ctx.addIssue({ code: 'custom', message: 'Harita sayısı zorunlu.' });
    } else {
      if (!v.content_name) ctx.addIssue({ code: 'custom', message: 'İçerik adı zorunlu.' });
      if (!v.content_length) ctx.addIssue({ code: 'custom', message: 'İçerik uzunluğu zorunlu.' });
    }
  });

type ValidInput = z.infer<typeof workItemSchema>;

function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Geçersiz veri.';
}

/** Tür'e göre ilgisiz alanları temizleyip DB satırına çevirir. */
function toRow(v: ValidInput, clientId: string | null) {
  const isStream = v.work_type === 'STREAM';
  return {
    work_type: v.work_type,
    work_date: v.work_date,
    notes: v.notes || null,
    match_name: isStream ? v.match_name || null : null,
    duration_minutes: isStream ? v.duration_minutes || null : null,
    map_count: isStream ? v.map_count ?? null : null,
    content_name: !isStream ? v.content_name || null : null,
    content_length: !isStream ? v.content_length || null : null,
    client_id: clientId,
  };
}

async function resolveClientId(clientId: string | null | undefined): Promise<string | null> {
  if (clientId) return clientId;
  const def = await clientService.getInternalDefault();
  return def?.id ?? null;
}

/** Fiyatı sunucuda çöz — tanımlı değilse null kalır, admin onayda belirler. */
async function resolvePrice(userId: string, clientId: string | null, v: ValidInput) {
  if (!clientId) return { cost: null as number | null, billAmount: null as number | null };
  const resolved = await rateCardService.resolveRate(userId, clientId, v.work_type, {
    contentLength: v.content_length ?? null,
    mapCount: v.map_count ?? null,
  });
  if (!resolved) return { cost: null, billAmount: null };
  return {
    cost: resolved.pay_amount,
    billAmount: resolved.is_internal ? null : resolved.bill_amount,
  };
}

function workTitle(v: { work_type: WorkType; match_name?: string | null; content_name?: string | null }) {
  return (v.work_type === 'STREAM' ? v.match_name : v.content_name) || 'İş kaydı';
}

function revalidateWork() {
  revalidatePath('/work-items');
  revalidatePath('/payments');
  revalidatePath('/');
}

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single();
  return (data as { id: string; role: string; full_name: string } | null) ?? null;
}

// ---------------------------------------------------------------------------
// Ücret önizlemesi — formda "Bu iş için ₺X alacaksın"
// ---------------------------------------------------------------------------

export interface RatePreview {
  /** null → bu kişi × müşteri × iş için ücret tanımlı değil */
  amount: number | null;
  /** Yayında harita başı ücret (amount = perMap × harita) */
  perMap: number | null;
}

/**
 * Yalnızca OTURUMDAKİ kişinin kendi ücretini döner (pay_amount).
 * Müşteriye kesilen tutar (bill_amount) asla istemciye gitmez.
 */
export async function previewWorkItemRate(input: {
  work_type: WorkType;
  client_id: string | null;
  content_length?: 'SHORT' | 'LONG' | null;
  map_count?: number | null;
}): Promise<RatePreview> {
  const me = await currentUser();
  if (!me) return { amount: null, perMap: null };

  const clientId = await resolveClientId(input.client_id);
  if (!clientId) return { amount: null, perMap: null };

  const resolved = await rateCardService.resolveRate(me.id, clientId, input.work_type, {
    contentLength: input.content_length ?? null,
    mapCount: input.map_count ?? null,
  });
  if (!resolved) return { amount: null, perMap: null };

  if (input.work_type === 'STREAM') {
    const maps = input.map_count && input.map_count > 0 ? input.map_count : 1;
    return { amount: resolved.pay_amount, perMap: resolved.pay_amount / maps };
  }
  return { amount: resolved.pay_amount, perMap: null };
}

// ---------------------------------------------------------------------------
// Oluştur
// ---------------------------------------------------------------------------

/**
 * @param planId "Yayını gir" ile planlı yayından gelindiyse planın id'si —
 *   iş kaydedilince plan bu işe bağlanır ve tamamlandı işaretlenir.
 */
export async function createWorkItem(input: CreateWorkItemInput, planId?: string): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { success: false, error: 'Giriş yapmanız gerekiyor.' };

  // Sunucu tarafı doğrulama (istemciye güvenmiyoruz)
  const parsed = workItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const clientId = await resolveClientId(v.client_id);
  const { cost, billAmount } = await resolvePrice(me.id, clientId, v);

  // Admin istemci ile insert: çözülen fiyat kesin kaynaktır, RLS'e takılmaz.
  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from('work_items')
    .insert({
      ...toRow(v, clientId),
      user_id: me.id,
      cost,
      bill_amount: billAmount,
      status: 'DRAFT',
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('Error creating work item:', error?.message);
    return { success: false, error: 'İş kaydı oluşturulamadı.' };
  }

  // Planlı yayından gelindiyse planı kapat — sadece KENDİ açık planı (RLS de korur).
  if (planId) {
    const plan = await contentPlanService.getById(planId);
    if (plan && plan.assigned_to === me.id && plan.status !== 'DONE' && plan.status !== 'CANCELLED') {
      await contentPlanService.completeWithWorkItem(planId, inserted.id);
    }
  }

  // Admin'e onay kuyruğu bildirimi. Ücret çözülemediyse bunu açıkça söyle —
  // sessizce ₺0'lık iş girilmesin.
  if (me.role !== 'ADMIN') {
    await notificationService.notify({
      roles: ['ADMIN'],
      title: cost == null ? '⚠️ Ücreti tanımsız yeni iş' : '🧾 Yeni iş girildi',
      body:
        `${me.full_name} · ${workTitle(v)}` +
        (v.map_count ? ` · ${v.map_count} harita` : '') +
        (cost == null ? ' — ücret tanımlı değil, onayda belirle' : ` · ₺${cost.toLocaleString('tr-TR')}`),
      url: '/work-items?status=DRAFT',
      tag: `work-${inserted.id}`,
    });
  }

  revalidateWork();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Kendi taslağını düzenle / sil
// ---------------------------------------------------------------------------

/** Düzenlenebilir mi? Sahibi (veya admin) ve hâlâ TASLAK. */
async function loadEditable(id: string, me: { id: string; role: string }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('work_items')
    .select('id, user_id, status')
    .eq('id', id)
    .single();
  const item = data as { id: string; user_id: string; status: string } | null;
  if (!item) return { item: null, error: 'İş kaydı bulunamadı.' };
  if (item.user_id !== me.id && me.role !== 'ADMIN') return { item: null, error: 'Bu kayıt sana ait değil.' };
  if (item.status !== 'DRAFT') return { item: null, error: 'Onaylanan iş düzenlenemez. Admin ile iletişime geç.' };
  return { item, error: null };
}

export async function updateOwnWorkItem(id: string, input: CreateWorkItemInput): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { success: false, error: 'Giriş yapmanız gerekiyor.' };
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Geçersiz kayıt.' };

  const { item, error: loadError } = await loadEditable(id, me);
  if (!item) return { success: false, error: loadError ?? 'Düzenlenemez.' };

  const parsed = workItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  // Fiyat, kaydın SAHİBİNİN ücret kartından yeniden çözülür (harita sayısı
  // değiştiyse ücret de değişir). Elle ücret girişi yok.
  const clientId = await resolveClientId(v.client_id);
  const { cost, billAmount } = await resolvePrice(item.user_id, clientId, v);

  const admin = createAdminClient();
  const { error } = await admin
    .from('work_items')
    .update({ ...toRow(v, clientId), cost, bill_amount: billAmount, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'DRAFT'); // yarış koşulu: bu arada onaylandıysa dokunma

  if (error) {
    console.error('Error updating work item:', error.message);
    return { success: false, error: 'Kayıt güncellenemedi.' };
  }

  revalidateWork();
  return { success: true };
}

export async function deleteOwnWorkItem(id: string): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { success: false, error: 'Giriş yapmanız gerekiyor.' };
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Geçersiz kayıt.' };

  const { item, error: loadError } = await loadEditable(id, me);
  if (!item) return { success: false, error: loadError ?? 'Silinemez.' };

  const admin = createAdminClient();

  // Planlı yayından girildiyse plan yeniden açılsın — yayıncı doğrusunu girebilsin.
  await admin
    .from('content_plans')
    .update({ status: 'PLANNED', work_item_id: null })
    .eq('work_item_id', id);

  const { error } = await admin.from('work_items').delete().eq('id', id).eq('status', 'DRAFT');
  if (error) {
    console.error('Error deleting work item:', error.message);
    return { success: false, error: 'Silme işlemi başarısız.' };
  }

  revalidateWork();
  return { success: true };
}
