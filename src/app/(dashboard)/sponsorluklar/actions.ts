'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { sponsorService, type SponsorFileCategory, type SponsorStatus } from '@/services/sponsor.service';

async function assertAdmin(): Promise<boolean> {
  const user = await userService.getCurrentUser();
  return Boolean(user && user.role === 'ADMIN');
}

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}

export async function createSponsor(formData: FormData): Promise<{ id?: string; error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };
  const name = str(formData.get('name'));
  if (!name) return { error: 'İsim zorunlu' };

  const dealRaw = str(formData.get('deal_value'));
  const result = await sponsorService.create({
    name,
    status: (str(formData.get('status')) as SponsorStatus) ?? 'ACTIVE',
    start_date: str(formData.get('start_date')),
    end_date: str(formData.get('end_date')),
    terms: str(formData.get('terms')),
    notes: str(formData.get('notes')),
    contact: str(formData.get('contact')),
    deal_value: dealRaw ? Number(dealRaw) : null,
  });
  if (result.error || !result.id) return { error: result.error ?? 'Oluşturulamadı' };

  const logo = formData.get('logo');
  if (logo instanceof File && logo.size > 0) {
    await sponsorService.uploadLogo(result.id, logo);
  }

  revalidatePath('/sponsorluklar');
  return { id: result.id };
}

export async function updateSponsor(id: string, formData: FormData): Promise<{ error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };
  const dealRaw = str(formData.get('deal_value'));
  const result = await sponsorService.update(id, {
    name: str(formData.get('name')) ?? undefined,
    status: (str(formData.get('status')) as SponsorStatus) ?? undefined,
    start_date: str(formData.get('start_date')),
    end_date: str(formData.get('end_date')),
    terms: str(formData.get('terms')),
    notes: str(formData.get('notes')),
    contact: str(formData.get('contact')),
    deal_value: dealRaw ? Number(dealRaw) : null,
  });
  if (result.error) return result;

  const logo = formData.get('logo');
  if (logo instanceof File && logo.size > 0) {
    await sponsorService.uploadLogo(id, logo);
  }

  revalidatePath('/sponsorluklar');
  revalidatePath(`/sponsorluklar/${id}`);
  return {};
}

export async function deleteSponsor(id: string): Promise<{ error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };
  const result = await sponsorService.delete(id);
  revalidatePath('/sponsorluklar');
  return result;
}

export async function uploadSponsorFile(formData: FormData): Promise<{ error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };
  const sponsorId = str(formData.get('sponsor_id'));
  const category = (str(formData.get('category')) as SponsorFileCategory) ?? 'other';
  const file = formData.get('file');
  if (!sponsorId) return { error: 'Sponsor yok' };
  if (!(file instanceof File) || file.size === 0) return { error: 'Dosya seçilmedi' };

  const result = await sponsorService.uploadFile(sponsorId, category, file);
  revalidatePath(`/sponsorluklar/${sponsorId}`);
  return result;
}

export async function deleteSponsorFile(fileId: string, sponsorId: string): Promise<{ error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };
  const result = await sponsorService.deleteFile(fileId);
  revalidatePath(`/sponsorluklar/${sponsorId}`);
  return result;
}

/** Fresh signed URL for viewing/downloading a stored file. */
export async function getSignedUrl(path: string): Promise<{ url?: string; error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };
  const url = await sponsorService.signedUrl(path);
  return url ? { url } : { error: 'URL alınamadı' };
}
