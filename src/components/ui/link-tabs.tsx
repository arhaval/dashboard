'use client';

/**
 * LinkTabs — aktif sekmeyi URL'den kendisi bulan sayfa sekmeleri.
 * Görünüm ui/tabs.tsx'teki Tabs ile birebir aynı.
 */

import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Tabs } from './tabs';

export interface LinkTabItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** true: sadece tam eşleşmede aktif (alt sayfalarda değil) */
  exact?: boolean;
}

export function LinkTabs({ items, className }: { items: LinkTabItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <Tabs
      className={className}
      items={items.map((t) => ({
        key: t.href,
        label: t.label,
        icon: t.icon,
        href: t.href,
        active: t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`),
      }))}
    />
  );
}
