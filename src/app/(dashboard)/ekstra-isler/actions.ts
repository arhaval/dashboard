/**
 * Müşteriler — Server Actions (admin-only)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { clientService } from '@/services/client.service';
import type { CreateClientInput, UpdateClientInput } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
}

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data?.role === 'ADMIN';
}

export async function createClientAction(input: CreateClientInput): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { success: false, error: 'Yetkisiz' };
  if (!input.name?.trim()) return { success: false, error: 'İsim zorunlu.' };

  const created = await clientService.create({
    name: input.name.trim(),
    is_internal: input.is_internal ?? false,
    notes: input.notes ?? null,
  });
  if (!created) return { success: false, error: 'Müşteri eklenemedi.' };

  revalidatePath('/ekstra-isler');
  revalidatePath('/work-items/new');
  return { success: true };
}

export async function updateClientAction(
  id: string,
  updates: UpdateClientInput
): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { success: false, error: 'Yetkisiz' };
  const updated = await clientService.update(id, updates);
  if (!updated) return { success: false, error: 'Müşteri güncellenemedi.' };

  revalidatePath('/ekstra-isler');
  revalidatePath('/work-items/new');
  return { success: true };
}
