/**
 * Navigation config — tek kaynak.
 * Sidebar, ikon şeridi ve ⌘K arama aynı listeyi kullanır; görünürlük
 * kuralı (rol + yetki matrisi) da burada tek yerde.
 */

import {
  LayoutDashboard, Users, FileText, CreditCard, PiggyBank, BarChart3,
  FileOutput, CalendarDays, ClipboardList, Tv2, PlayCircle, Handshake,
  Lightbulb, ShieldCheck, Sparkles, Swords, NotebookPen, Wallet,
  Building2, Coins, type LucideIcon,
} from 'lucide-react';
import { tr } from '@/lib/i18n';
import type { PageKey } from '@/constants/permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Page-access key checked against the role's allowed pages. */
  perm?: PageKey;
  /** Admin-only items (not part of the editable matrix, e.g. settings). */
  adminOnly?: boolean;
  /** Sadece admin dışı roller (admin'in tam yetkili karşılığı başka sayfada). */
  memberOnly?: boolean;
  /** Role özel etiket (ör. çalışan için "İş Takibi" → "Yayınlarım"). */
  roleLabels?: Partial<Record<string, string>>;
}

export interface NavSection {
  label: string;
  /** İkon şeridinde bu bölümü temsil eden ikon. */
  icon: LucideIcon;
  items: NavItem[];
  /** Arşiv: kapalı başlar, başlığına basınca açılır. */
  archive?: boolean;
}

/**
 * Menü modüllere göre değil İŞE göre bölünmüş (İÇERİK, PARA, EKİP...).
 * Arşivdekiler son kayıt tarihine bakılarak seçildi — silinmediler, sadece
 * her açılışta göz önünde değiller.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'ANA MENÜ',
    icon: LayoutDashboard,
    items: [
      { label: tr.nav.dashboard, href: '/', icon: LayoutDashboard, perm: 'dashboard' },
      { label: 'Günlük', href: '/gunluk', icon: NotebookPen, perm: 'journal' },
    ],
  },
  {
    label: 'İÇERİK',
    icon: ClipboardList,
    items: [
      { label: 'İçerik Takip', href: '/icerik-plani', icon: ClipboardList, perm: 'content-plan' },
      { label: 'İçerik Motoru', href: '/motor', icon: Sparkles, perm: 'content-engine' },
      { label: 'Fikir Havuzu', href: '/fikir-havuzu', icon: Lightbulb, perm: 'idea-pool' },
      { label: 'İçerik Performansı', href: '/icerik-performansi', icon: PlayCircle, perm: 'content-performance' },
      { label: tr.nav.social, href: '/social', icon: BarChart3, perm: 'social' },
    ],
  },
  {
    label: 'PARA',
    icon: Wallet,
    items: [
      {
        label: tr.nav.workItems, href: '/work-items', icon: FileText, perm: 'work-items',
        roleLabels: { PUBLISHER: 'Yayınlarım', EDITOR: 'İşlerim', VOICE: 'İşlerim' },
      },
      {
        label: tr.nav.payments, href: '/payments', icon: CreditCard, perm: 'payments',
        roleLabels: { PUBLISHER: 'Ödemelerim', EDITOR: 'Ödemelerim', VOICE: 'Ödemelerim' },
      },
      { label: tr.nav.finance, href: '/finance', icon: PiggyBank, perm: 'finance' },
      { label: 'Ekstra İşler', href: '/ekstra-isler', icon: Building2, adminOnly: true },
      { label: 'Ücretler', href: '/ucretler', icon: Coins, adminOnly: true },
      { label: 'Ücretlerim', href: '/ucretlerim', icon: Coins, memberOnly: true },
    ],
  },
  {
    label: 'EKİP',
    icon: Users,
    items: [{ label: tr.nav.team, href: '/team', icon: Users, perm: 'team' }],
  },
  {
    label: 'RAPOR',
    icon: FileOutput,
    items: [
      { label: 'Aylık Rapor', href: '/reports', icon: FileOutput, perm: 'reports' },
      { label: 'Haftalık Rapor', href: '/reports/weekly', icon: ClipboardList, perm: 'reports' },
    ],
  },
  {
    label: 'ARŞİV',
    icon: Handshake,
    archive: true,
    items: [
      { label: 'Sponsorluklar', href: '/sponsorluklar', icon: Handshake, perm: 'sponsors' },
      { label: 'Haftalık Program', href: '/content/schedule', icon: CalendarDays, perm: 'schedule' },
      { label: 'OBS Overlay', href: '/obs', icon: Tv2, perm: 'obs' },
      // Yetki matrisinde karşılığı yok; yöneticiye açık.
      { label: 'Maçlar', href: '/matches', icon: Swords, adminOnly: true },
      { label: 'Nakit Akışı', href: '/nakit', icon: Wallet, adminOnly: true },
    ],
  },
  {
    label: 'AYARLAR',
    icon: ShieldCheck,
    items: [{ label: 'Roller & Yetkiler', href: '/ayarlar/yetkiler', icon: ShieldCheck, adminOnly: true }],
  },
];

/** Rol + yetki matrisine göre görünür mü? (tek kural) */
export function canSeeItem(item: NavItem, role: string, allowedPages: string[] = []): boolean {
  if (item.adminOnly) return role === 'ADMIN';
  if (item.memberOnly) return role !== 'ADMIN';
  if (item.perm) return role === 'ADMIN' || allowedPages.includes(item.perm);
  return true;
}

/** Bölümleri görünür öğeleriyle döndürür; boş bölümler atlanır. */
export function visibleSections(role: string, allowedPages: string[] = []) {
  return NAV_SECTIONS
    .map((s) => ({
      ...s,
      items: s.items
        .filter((i) => canSeeItem(i, role, allowedPages))
        .map((i) => ({ ...i, label: i.roleLabels?.[role] ?? i.label })),
    }))
    .filter((s) => s.items.length > 0);
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}
