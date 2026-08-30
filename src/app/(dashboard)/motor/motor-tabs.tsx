'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/motor', label: 'Metinler' },
  { href: '/motor/dna', label: 'Arhaval DNA' },
  { href: '/motor/formatlar', label: 'Formatlar' },
  { href: '/motor/referanslar', label: 'Referanslar' },
];

export function MotorTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] mb-6">
      {TABS.map((t) => {
        const active = t.href === '/motor' ? pathname === '/motor' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
