/**
 * Sidebar Component
 * Main navigation sidebar for the dashboard
 * Fixed width: 256px
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

const navItems: NavItem[] = [
  {
    label: tr.nav.dashboard,
    href: '/',
    icon: LayoutDashboard,
  },
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
    // All users can see their own payments (non-admin sees their transactions)
  },
  {
    label: tr.nav.finance,
    href: '/finance',
    icon: PiggyBank,
    adminOnly: true,
  },
  {
    label: tr.nav.social,
    href: '/social',
    icon: BarChart3,
  },
  {
    label: tr.nav.reports,
    href: '/reports',
    icon: FileOutput,
    adminOnly: true,
  },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole = 'ADMIN' }: SidebarProps) {
  const pathname = usePathname();

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN'
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen',
        'w-[var(--sidebar-width)] flex-shrink-0',
        'border-r border-[var(--color-border)]',
        'bg-[var(--color-bg-secondary)]'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div
          className={cn(
            'flex h-[var(--header-height)] items-center',
            'border-b border-[var(--color-border)]',
            'px-6'
          )}
        >
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Arhaval Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-[var(--radius-sm)]"
            />
            <span className="text-display text-base font-semibold text-[var(--color-text-primary)]">
              Yönetim Paneli
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => {
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
                      'text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div
          className={cn(
            'border-t border-[var(--color-border)]',
            'p-4 text-xs text-[var(--color-text-muted)]'
          )}
        >
          <p>Arhaval Yönetim Paneli</p>
          <p>v0.1.0</p>
        </div>
      </div>
    </aside>
  );
}
