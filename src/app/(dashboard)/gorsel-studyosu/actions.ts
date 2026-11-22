'use server';

import { z } from 'zod';
import { gorselYetkisiniDogrula } from '@/lib/gorsel/yetki';
import { gorselMacService, type GorselMacFormSonucu } from '@/services/gorsel-mac.service';

const macIdSchema = z.string().uuid();

/** Seçilen maçın maç günü postunu doldurur. Paylaşılacak maçı ekip seçer. */
export async function macPostunuHazirla(macId: string): Promise<GorselMacFormSonucu> {
  const yetki = await gorselYetkisiniDogrula();
  if (!yetki.ok) return { ok: false, hata: 'Bu işlem için yetkin yok.' };
  const id = macIdSchema.safeParse(macId);
  if (!id.success) return { ok: false, hata: 'Geçersiz maç.' };
  try {
    return await gorselMacService.form(id.data);
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : 'Maç bilgisi alınamadı.' };
  }
}
