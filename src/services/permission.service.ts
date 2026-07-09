/**
 * Central role → page-access service. Reads/writes the `role_access` table via
 * the admin client. Missing rows fall back to DEFAULT_PAGES; ADMIN is always full.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_PAGES,
  ALL_PAGE_KEYS,
  EDITABLE_ROLES,
  type PageKey,
} from '@/constants/permissions';
import type { UserRole } from '@/types';

export const permissionService = {
  async getAllowedPages(role: UserRole): Promise<PageKey[]> {
    if (role === 'ADMIN') return ALL_PAGE_KEYS;
    const admin = createAdminClient();
    const { data } = await admin.from('role_access').select('pages').eq('role', role).maybeSingle();
    if (data && Array.isArray(data.pages)) return data.pages as PageKey[];
    return DEFAULT_PAGES[role] ?? [];
  },

  /** Current allowed pages for every editable role (for the admin matrix). */
  async getMatrix(): Promise<Record<string, PageKey[]>> {
    const admin = createAdminClient();
    const { data } = await admin.from('role_access').select('role, pages');
    const stored = new Map<string, PageKey[]>();
    for (const r of (data ?? []) as { role: string; pages: PageKey[] }[]) {
      stored.set(r.role, r.pages);
    }
    const out: Record<string, PageKey[]> = {};
    for (const role of EDITABLE_ROLES) {
      out[role] = stored.get(role) ?? DEFAULT_PAGES[role];
    }
    return out;
  },

  async setRolePages(role: UserRole, pages: PageKey[]): Promise<{ error?: string }> {
    if (role === 'ADMIN' || !EDITABLE_ROLES.includes(role)) {
      return { error: 'Bu rolün yetkileri değiştirilemez' };
    }
    const valid = pages.filter((p) => (ALL_PAGE_KEYS as string[]).includes(p));
    const admin = createAdminClient();
    const { error } = await admin
      .from('role_access')
      .upsert({ role, pages: valid, updated_at: new Date().toISOString() }, { onConflict: 'role' });
    return error ? { error: error.message } : {};
  },
};
