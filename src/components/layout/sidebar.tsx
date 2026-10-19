'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  PiggyBank,
  BarChart3,
  FileOutput,
  CalendarDays,
  ClipboardList,
  Tv2,
  X,
  PlayCircle,
  Handshake,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Swords,
  Wallet,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import type { PageKey } from '@/constants/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Page-access key checked against the role's allowed pages. */
  perm?: PageKey;
  /** Admin-only items (not part of the editable matrix, e.g. settings). */
  adminOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
  /**
   * Arşiv bölümü: kapalı başlar, başlığına basınca açılır.
   * Aylardır kayıt girilmemiş modüller burada durur — silinmiyorlar, sadece
   * her açılışta göz önünde olmuyorlar.
   */
  archive?: boolean;
}

/**
 * Menü modüllere göre değil İŞE göre bölünmüş.
 *
 * Eskiden "YÖNETİM / ANALİTİK / YAYIN / DİĞER" diye bölünüyordu; bu, kodun
 * klasörlerine benziyordu ama günlük işe benzemiyordu — içerik işi üç ayrı
 * bölüme dağılmıştı, para işi başka bir bölümde duruyordu. Şimdi başlıklar
 * yapılan işi söylüyor: İÇERİK, PARA, EKİP.
 *
 * Arşivdekiler veriyle seçildi (son kayıt tarihine bakarak): Sponsorluklar
 * Temmuz'dan beri 1 kayıt, Haftalık Program Nisan'dan beri durgun, Maçlar
 * Mayıs'ta kalmış. Maçlar ve Nakit menüde HİÇ yoktu — sayfa vardı, bağlantı
 * yoktu; Nakit'in sıfır kaydı olmasının sebebi de buydu.
 */
const navSections: NavSection[] = [
  {
    label: 'ANA MENÜ',
    items: [
      { label: tr.nav.dashboard, href: '/', icon: LayoutDashboard, perm: 'dashboard' },
    ],
  },
  {
    label: 'İÇERİK',
    items: [
      { label: 'İçerik Takip',       href: '/icerik-plani',       icon: ClipboardList, perm: 'content-plan' },
      { label: 'İçerik Motoru',      href: '/motor',              icon: Sparkles,      perm: 'content-engine' },
      { label: 'Fikir Havuzu',       href: '/fikir-havuzu',       icon: Lightbulb,     perm: 'idea-pool' },
      { label: 'İçerik Performansı', href: '/icerik-performansi', icon: PlayCircle,    perm: 'content-performance' },
      { label: tr.nav.social,        href: '/social',             icon: BarChart3,     perm: 'social' },
    ],
  },
  {
    label: 'PARA',
    items: [
      { label: tr.nav.workItems, href: '/work-items', icon: FileText,   perm: 'work-items' },
      { label: tr.nav.payments,  href: '/payments',   icon: CreditCard, perm: 'payments' },
      { label: tr.nav.finance,   href: '/finance',    icon: PiggyBank,  perm: 'finance' },
    ],
  },
  {
    label: 'EKİP',
    items: [
      { label: tr.nav.team, href: '/team', icon: Users, perm: 'team' },
    ],
  },
  {
    label: 'RAPOR',
    items: [
      { label: 'Aylık Rapor',    href: '/reports',        icon: FileOutput,    perm: 'reports' },
      { label: 'Haftalık Rapor', href: '/reports/weekly', icon: ClipboardList, perm: 'reports' },
    ],
  },
  {
    label: 'ARŞİV',
    archive: true,
    items: [
      { label: 'Sponsorluklar',    href: '/sponsorluklar',   icon: Handshake,    perm: 'sponsors' },
      { label: 'Haftalık Program', href: '/content/schedule', icon: CalendarDays, perm: 'schedule' },
      { label: 'OBS Overlay',      href: '/obs',             icon: Tv2,          perm: 'obs' },
      // Bu ikisinin yetki matrisinde karşılığı yok; yöneticiye açık.
      { label: 'Maçlar',           href: '/matches',         icon: Swords,       adminOnly: true },
      { label: 'Nakit Akışı',      href: '/nakit',           icon: Wallet,       adminOnly: true },
    ],
  },
  {
    label: 'AYARLAR',
    items: [
      { label: 'Roller & Yetkiler', href: '/ayarlar/yetkiler', icon: ShieldCheck, adminOnly: true },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
  allowedPages?: string[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userRole = 'ADMIN', allowedPages = [], isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  // Arşiv kapalı başlar; içindeki bir sayfadaysan kendiliğinden açık olsun ki
  // bulunduğun yer menüde görünmeden kalmasın.
  const inArchive = navSections
    .filter((s) => s.archive)
    .some((s) => s.items.some((i) => i.href !== '/' && pathname.startsWith(i.href)));
  const [archiveOpen, setArchiveOpen] = React.useState(inArchive);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] flex-shrink-0',
        'transition-transform duration-300 ease-in-out',
        // Desktop: always visible
        'lg:translate-x-0',
        // Mobile: hidden by default, slides in when open
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
    >
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div
          className="flex h-[var(--header-height)] items-center justify-between px-6"
          style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          <Link href="/" className="flex items-center gap-3" onClick={onClose}>
            <Image
              src="/logo.png"
              alt="Arhaval Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-[var(--radius-sm)]"
            />
            <span className="text-display text-base font-semibold text-white">
              Arhaval Yönetim
            </span>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (item.adminOnly) return userRole === 'ADMIN';
              if (item.perm) return userRole === 'ADMIN' || allowedPages.includes(item.perm);
              return true;
            });

            if (visibleItems.length === 0) return null;

            const collapsed = Boolean(section.archive) && !archiveOpen;

            return (
              <div key={section.label} className="mb-6">
                {section.archive ? (
                  <button
                    onClick={() => setArchiveOpen((v) => !v)}
                    className="mb-2 flex w-full items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-sidebar-label)' }}
                  >
                    <ChevronDown
                      className="h-3 w-3 transition-transform"
                      style={{ transform: archiveOpen ? 'none' : 'rotate(-90deg)' }}
                    />
                    {section.label}
                    <span className="ml-auto font-normal normal-case tracking-normal">
                      {visibleItems.length}
                    </span>
                  </button>
                ) : (
                  <p
                    className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-sidebar-label)' }}
                  >
                    {section.label}
                  </p>
                )}
                <ul className={cn('space-y-0.5', collapsed && 'hidden')}>
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-3',
                            'rounded-[var(--radius-md)] px-3 py-2.5',
                            'text-sm font-medium transition-all duration-150'
                          )}
                          style={
                            isActive
                              ? { backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }
                              : { color: 'var(--color-sidebar-text)' }
                          }
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                'var(--color-sidebar-bg-hover)';
                              (e.currentTarget as HTMLAnchorElement).style.color = '#FFFFFF';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                'transparent';
                              (e.currentTarget as HTMLAnchorElement).style.color =
                                'var(--color-sidebar-text)';
                            }
                          }}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-sidebar-label)' }}>
            Arhaval Yönetim Paneli
          </p>
          <p className="text-xs" style={{ color: 'var(--color-sidebar-label)' }}>
            v0.1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
