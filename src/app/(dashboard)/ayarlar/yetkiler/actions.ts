'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { permissionService } from '@/services/permission.service';
import { EDITABLE_ROLES, ALL_PAGE_KEYS, type PageKey } from '@/constants/permissions';
import type { UserRole } from '@/types';

export async function saveRolePages(role: string, pages: string[]): Promise<{ error?: string }> {
  const user = await userService.getCurrentUser();
  if (user?.role !== 'ADMIN') return { error: 'Yetki yok' };
  if (!EDITABLE_ROLES.includes(role as UserRole)) return { error: 'Geçersiz rol' };

  const valid = pages.filter((p): p is PageKey => (ALL_PAGE_KEYS as string[]).includes(p));
  const res = await permissionService.setRolePages(role as UserRole, valid);
  if (res.error) return res;

  revalidatePath('/ayarlar/yetkiler');
  revalidatePath('/', 'layout'); // refresh sidebar + access guards everywhere
  return {};
}
