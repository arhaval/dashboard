/**
 * Tabs — Tessera dili, tek kaynak.
 *
 *  Tabs             → alt çizgili sekme satırı (sayfa sekmeleri). Aktif: beyaz
 *                     yazı + beyaz alt çizgi; pasif: soluk.
 *  SegmentedControl → kart içi geçiş (Tümü / Yayınlar …). Aktif: yükseltilmiş
 *                     nötr zemin.
 *
 * Hook içermez: öğe `href` taşırsa bağlantı, `onClick` taşırsa buton çizer —
 * sunucu sayfaları da istemci bileşenleri de kullanabilir. URL'e göre aktifliği
 * kendisi bulan sürüm için bkz. link-tabs.tsx.
 */

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

function Inner({ item }: { item: TabItem }) {
  const Icon = item.icon;
  return (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {item.label}
      {item.count !== undefined && (
        <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{item.count}</span>
      )}
    </>
  );
}

export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn('flex gap-1 overflow-x-auto border-b border-[var(--color-border)]', className)} aria-label="Sekmeler">
      {items.map((item) => {
        const cls = cn(
          'relative flex items-center gap-2 whitespace-nowrap px-2.5 pb-3 pt-2 text-sm transition-colors',
          item.active
            ? 'font-medium text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
        );
        const underline = item.active && (
          <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-text-primary)]" />
        );
        return item.href ? (
          <Link key={item.key} href={item.href} className={cls} aria-current={item.active ? 'page' : undefined}>
            <Inner item={item} />
            {underline}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} className={cls} aria-pressed={item.active}>
            <Inner item={item} />
            {underline}
          </button>
        );
      })}
    </nav>
  );
}

export function SegmentedControl({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const cls = cn(
          'flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 py-1 text-xs transition-colors',
          item.active
            ? 'bg-[var(--color-bg-tertiary)] font-medium text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
        );
        const inner = (
          <>
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {item.label}
            {item.count !== undefined && <span className="tabular-nums opacity-70">{item.count}</span>}
          </>
        );
        return item.href ? (
          <Link key={item.key} href={item.href} className={cls} aria-current={item.active ? 'page' : undefined}>
            {inner}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} aria-pressed={item.active} className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
