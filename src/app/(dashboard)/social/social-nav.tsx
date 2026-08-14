'use client';

/**
 * Sosyal Medya sekmeleri. Sidebar'da tek giriş var; bölümler burada ayrılıyor.
 *
 * Üç sekmenin görevi bilinçli olarak ayrı:
 *   Genel Bakış  → ne durumdayız
 *   Analiz       → neden böyle oldu
 *   Veri Merkezi → neyi tamamlamam gerekiyor
 */

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, Database, LayoutDashboard } from 'lucide-react';

const TABS = [
  { href: '/social', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/social/analytics', label: 'Analiz', icon: BarChart3 },
  { href: '/social/data', label: 'Veri Merkezi', icon: Database },
];

export function SocialNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Seçili ay sekmeler arasında korunur — kullanıcı ayı yeniden seçmesin.
  const month = params.get('month');
  const suffix = month ? `?month=${month}` : '';

  return (
    <div
      className="mb-5 inline-flex gap-1 rounded-[var(--radius-md)] p-1"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        // '/social' bütün alt yolların öneki; tam eşleşme gerekiyor.
        const active = href === '/social' ? pathname === '/social' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={`${href}${suffix}`}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors"
            style={active
              ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
              : { color: 'var(--color-text-muted)' }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
