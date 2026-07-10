/**
 * Central page-access permission registry.
 * Single source of truth for "which role can see/reach which page".
 * Stored overrides live in the `role_access` table; when a role has no row,
 * DEFAULT_PAGES applies (preserving the original hardcoded behavior).
 * ADMIN always has full access and is never stored/editable.
 */

import type { UserRole } from '@/types';

export type PageKey =
  | 'dashboard'
  | 'work-items'
  | 'payments'
  | 'finance'
  | 'team'
  | 'sponsors'
  | 'schedule'
  | 'social'
  | 'content-plan'
  | 'idea-pool'
  | 'content-performance'
  | 'obs'
  | 'reports';

export interface PageDef {
  key: PageKey;
  label: string;
  /** Base route used for URL-level enforcement (longest match wins). */
  route: string;
  group: string;
}

export const PAGE_DEFS: PageDef[] = [
  { key: 'dashboard',           label: 'Ana Sayfa',          route: '/',                  group: 'Genel' },
  { key: 'work-items',          label: 'İş Takibi',          route: '/work-items',        group: 'Yönetim' },
  { key: 'payments',            label: 'Ödemeler',           route: '/payments',          group: 'Yönetim' },
  { key: 'finance',             label: 'Finans',             route: '/finance',           group: 'Yönetim' },
  { key: 'team',                label: 'Ekip',               route: '/team',              group: 'Yönetim' },
  { key: 'sponsors',            label: 'Sponsorluklar',      route: '/sponsorluklar',     group: 'Yönetim' },
  { key: 'schedule',            label: 'Haftalık Program',   route: '/content/schedule',  group: 'Analitik' },
  { key: 'social',              label: 'Sosyal Medya',       route: '/social',            group: 'Analitik' },
  { key: 'content-plan',        label: 'İçerik Planı',       route: '/icerik-plani',      group: 'Analitik' },
  { key: 'idea-pool',           label: 'Fikir Havuzu',       route: '/fikir-havuzu',      group: 'Analitik' },
  { key: 'content-performance', label: 'İçerik Performansı', route: '/icerik-performansi',group: 'Analitik' },
  { key: 'obs',                 label: 'OBS Overlay',        route: '/obs',               group: 'Yayın' },
  { key: 'reports',             label: 'Raporlar',           route: '/reports',           group: 'Diğer' },
];

export const ALL_PAGE_KEYS: PageKey[] = PAGE_DEFS.map((p) => p.key);

/** Editable roles (ADMIN excluded — always full access). */
export const EDITABLE_ROLES: UserRole[] = ['PUBLISHER', 'YOUTUBER', 'EDITOR', 'VOICE', 'GRAFIKER', 'TEAM_MEMBER'];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Yönetici',
  PUBLISHER: 'Yayıncı',
  YOUTUBER: 'Youtuber',
  EDITOR: 'Editör',
  VOICE: 'Seslendirmen',
  GRAFIKER: 'Grafiker',
  TEAM_MEMBER: 'Ekip Üyesi',
};

/** Defaults = the original hardcoded sidebar behavior. */
export const DEFAULT_PAGES: Record<UserRole, PageKey[]> = {
  ADMIN: ALL_PAGE_KEYS,
  PUBLISHER: ['dashboard', 'work-items', 'payments', 'schedule', 'content-plan', 'idea-pool'],
  YOUTUBER:  ['dashboard', 'work-items', 'payments', 'schedule', 'content-plan', 'idea-pool', 'social'],
  EDITOR:    ['dashboard', 'work-items', 'payments', 'schedule', 'social', 'content-plan', 'idea-pool'],
  VOICE:     ['dashboard', 'work-items', 'payments', 'schedule', 'social', 'content-plan', 'idea-pool'],
  GRAFIKER:  ['dashboard', 'work-items', 'payments', 'schedule', 'social', 'content-plan', 'idea-pool'],
  TEAM_MEMBER: ['dashboard', 'work-items', 'payments', 'content-plan', 'idea-pool'],
};

/** Map a pathname to the page it belongs to (longest route prefix wins). */
export function pageKeyForPath(pathname: string): PageKey | null {
  const candidates = PAGE_DEFS
    .filter((p) => p.route !== '/')
    .sort((a, b) => b.route.length - a.route.length);
  for (const p of candidates) {
    if (pathname === p.route || pathname.startsWith(`${p.route}/`)) {
      // /team/{id} is a self-accessible profile; the page enforces ownership.
      if (p.key === 'team' && pathname !== '/team') return null;
      return p.key;
    }
  }
  if (pathname === '/') return 'dashboard';
  return null; // unmapped route → not gated by the matrix
}
