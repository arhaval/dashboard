/**
 * Sidebar Component
 * Main navigation sidebar for the dashboard
 * Fixed width: 256px — Dark navy theme (YZEN-inspired)
 */

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
  Crosshair,
  Radio,
  CalendarDays,
  Target,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'ANA MENÜ',
    items: [
      {
        label: tr.nav.dashboard,
        href: '/',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'YÖNETİM',
    items: [
      {
        label: tr.nav.team,
        href: '/team',
        icon: Users,
        adminOnly: true,
      },
      {
        label: tr.nav.workItems,
        href: '/work-items',
        icon: FileText,
      },
      {
        label: tr.nav.payments,
        href: '/payments',
        icon: CreditCard,
      },
      {
        label: tr.nav.finance,
        href: '/finance',
        icon: PiggyBank,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'ANALİTİK',
    items: [
      {
        label: 'İçerik Takvimi',
        href: '/content',
        icon: CalendarDays,
      },
      {
        label: 'İçerik Hedefleri',
        href: '/content/goals',
        icon: Target,
      },
      {
        label: 'Haftalık Program',
        href: '/content/schedule',
        icon: CalendarDays,
      },
      {
        label: tr.nav.social,
        href: '/social',
        icon: BarChart3,
      },
      {
        label: tr.cs2.nav,
        href: '/matches',
        icon: Crosshair,
      },
      {
        label: tr.cs2.dathost.operations,
        href: '/matches/operations',
        icon: Radio,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'DİĞER',
    items: [
      {
        label: 'Aylık Rapor',
        href: '/reports',
        icon: FileOutput,
        adminOnly: true,
      },
      {
        label: 'Haftalık Rapor',
        href: '/reports/weekly',
        icon: ClipboardList,
        adminOnly: true,
      },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole = 'ADMIN' }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] flex-shrink-0"
      style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
    >
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div
          className="flex h-[var(--header-height)] items-center px-6"
          style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Arhaval Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-[var(--radius-sm)]"
            />
            <span className="text-display text-base font-semibold text-white">
              Yönetim Paneli
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || userRole === 'ADMIN'
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label} className="mb-6">
                <p
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--color-sidebar-label)' }}
                >
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3',
                            'rounded-[var(--radius-md)] px-3 py-2',
                            'text-sm font-medium transition-all duration-150'
                          )}
                          style={
                            isActive
                              ? {
                                  backgroundColor: 'var(--color-accent)',
                                  color: '#FFFFFF',
                                }
                              : {
                                  color: 'var(--color-sidebar-text)',
                                }
                          }
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                'var(--color-sidebar-bg-hover)';
                              (e.currentTarget as HTMLAnchorElement).style.color =
                                '#FFFFFF';
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
