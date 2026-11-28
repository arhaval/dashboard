'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { visibleSections, isActivePath } from './nav-config';

interface SidebarProps {
  userRole?: string;
  allowedPages?: string[];
  isOpen?: boolean;
  onClose?: () => void;
}

/** Tessera tarzı ikinci sütun: çalışma alanı başlığı + yeni iş + katlanabilir bölümler. */
export function Sidebar({ userRole = 'ADMIN', allowedPages = [], isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const sections = visibleSections(userRole, allowedPages);
  const canCreateWork = sections.some((s) => s.items.some((i) => i.href === '/work-items'));

  // Bölüm katlama: arşiv kapalı başlar (içindeysen açık), diğerleri açık.
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of sections) {
      if (s.archive) init[s.label] = !s.items.some((i) => isActivePath(pathname, i.href));
    }
    return init;
  });

  return (
    <aside
      className={cn(
        'z-40 flex w-60 flex-shrink-0 flex-col border-r border-[var(--color-border)]',
        // Mobil: kayan çekmece. Masaüstü: çerçeve içinde sabit sütun.
        'fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out',
        'lg:static lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
    >
      {/* Başlık */}
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Arhaval" width={28} height={28} className="h-7 w-7 rounded-[8px]" />
          <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">Arhaval</span>
        </Link>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar-bg-hover)] hover:text-[var(--color-text-primary)] lg:hidden"
          aria-label="Menüyü kapat"
          title="Menüyü kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Yeni iş */}
      {canCreateWork && (
        <div className="px-3 pb-3">
          <Link
            href="/work-items/new"
            onClick={onClose}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-sidebar-bg-hover)]"
          >
            <Plus className="h-4 w-4" /> Yeni iş
          </Link>
        </div>
      )}

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {sections.map((section) => {
          const isCollapsed = Boolean(collapsed[section.label]);
          return (
            <div key={section.label} className="mt-4 first:mt-1">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [section.label]: !c[section.label] }))}
                className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-sidebar-label)] hover:text-[var(--color-text-secondary)]"
              >
                {section.label}
                <ChevronDown className={cn('h-3 w-3 transition-transform', isCollapsed && '-rotate-90')} />
              </button>
              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm transition-colors',
                            active
                              ? 'bg-[var(--color-sidebar-bg-active)] font-medium text-[var(--color-sidebar-text-active)]'
                              : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-bg-hover)] hover:text-[var(--color-text-primary)]'
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
