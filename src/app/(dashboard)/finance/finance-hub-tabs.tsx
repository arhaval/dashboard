'use client';

/**
 * Finance Hub Tabs
 * Top-level section navigation that unifies Finans, Ödemeler and Nakit Akışı
 * under one roof. Rendered at the top of each of those admin pages.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PiggyBank, CreditCard, TrendingUp } from 'lucide-react';

const TABS = [
  { href: '/finance',  label: 'Finans',      icon: PiggyBank },
  { href: '/payments', label: 'Ödemeler',    icon: CreditCard },
  { href: '/nakit',    label: 'Nakit Akışı', icon: TrendingUp },
] as const;

export function FinanceHubTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold -mb-px border-b-2 transition-colors',
              active
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
