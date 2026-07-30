'use server';

/**
 * İçerik Bazlı Performans — server action.
 *
 * Filtre / sıralama / sayfa değişimi toplamayı SUNUCUDA yeniden çalıştırır ve
 * client'a yalnızca istenen sayfayı döndürür. Bütün yayınlar tarayıcıya
 * indirilip orada toplanmaz (§12).
 *
 * Bu ekran ADMIN'e özeldir; sayfa da aynı kontrolü yapıyor ama server action
 * ayrı bir giriş noktası olduğu için yetki burada TEKRAR doğrulanır.
 */

import { z } from 'zod';
import { userService } from '@/services';
import { contentImpactService } from '@/services/content-impact.service';
import {
  MAX_PAGE_SIZE,
  OVERALL_STATUSES,
  SORT_OPTIONS,
  type ContentImpactPage,
} from './content-impact.constants';

const PLATFORMS = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'TWITCH', 'X'] as const;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  search: z.string().max(200).default(''),
  from: z.string().regex(ISO_DAY).nullable().default(null),
  to: z.string().regex(ISO_DAY).nullable().default(null),
  contentType: z.string().max(100).default('ALL'),
  platforms: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length).default([]),
  reach: z.enum(['ALL', 'SINGLE', 'MULTI']).default('ALL'),
  status: z.enum(['ALL', ...OVERALL_STATUSES] as [string, ...string[]]).default('ALL'),
  library: z.enum(['ALL', 'IN_LIBRARY', 'NOT_IN_LIBRARY']).default('ALL'),
  sort: z.enum(SORT_OPTIONS as [string, ...string[]]).default('NEWEST'),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export type ContentImpactQueryInput = z.input<typeof querySchema>;

export async function fetchContentImpactPage(
  input: ContentImpactQueryInput
): Promise<{ page?: ContentImpactPage; error?: string }> {
  const user = await userService.getCurrentUser();
  if (!user) return { error: 'Oturum gerekli' };
  if (user.role !== 'ADMIN') return { error: 'Yetki yok' };

  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return { error: 'Geçersiz filtre' };

  const page = await contentImpactService.getPage(
    parsed.data as Parameters<typeof contentImpactService.getPage>[0]
  );
  return { page };
}
