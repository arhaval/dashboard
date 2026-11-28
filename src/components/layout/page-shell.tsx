/**
 * PageShell Component
 * Wrapper for all dashboard pages providing consistent structure.
 *
 * Every page MUST be wrapped in PageShell.
 * Tessera tarzı: kompakt alt başlık (ikon + başlık + açıklama · sağda meta/aksiyon)
 * ve isteğe bağlı sekme satırı. Sekmeler gerçek bağlantılardır.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tabs } from '@/components/ui/tabs';
import type { LucideIcon } from 'lucide-react';

export interface PageTab {
  label: string;
  href: string;
  icon?: LucideIcon;
  active?: boolean;
}

interface PageShellProps {
  /** Page title displayed in the header */
  title: string;
  /** Optional description next to / below the title */
  description?: string;
  /** Optional icon before the title */
  icon?: LucideIcon;
  /** Optional meta (e.g. "Güncellendi" + avatarlar) shown before actions */
  meta?: React.ReactNode;
  /** Optional action buttons (top right) */
  actions?: React.ReactNode;
  /** Optional tab row under the header */
  tabs?: PageTab[];
  /** Page content */
  children: React.ReactNode;
  /** Additional class names for the content wrapper */
  className?: string;
}

export function PageShell({
  title,
  description,
  icon: Icon,
  meta,
  actions,
  tabs,
  children,
  className,
}: PageShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Alt başlık */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />}
            <h1 className="text-display truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
              {title}
            </h1>
            {description && (
              <p className="hidden truncate text-sm text-[var(--color-text-muted)] md:block">
                <span className="mr-2 text-[var(--color-border-hover)]">·</span>
                {description}
              </p>
            )}
          </div>

          {(meta || actions) && (
            <div className="flex flex-wrap items-center gap-3">
              {meta}
              {actions}
            </div>
          )}
        </div>
        {description && (
          <p className="-mt-1.5 px-4 pb-3 text-sm text-[var(--color-text-muted)] sm:px-6 md:hidden">{description}</p>
        )}

        {/* Sekmeler — ortak ui/tabs (alt kenarı başlık kutusu çiziyor) */}
        {tabs && tabs.length > 0 && (
          <Tabs
            className="border-b-0 px-3 sm:px-5"
            items={tabs.map((t) => ({ key: t.href, label: t.label, icon: t.icon, href: t.href, active: t.active }))}
          />
        )}
      </div>

      {/* İçerik */}
      <div className={cn('flex-1 p-4 sm:p-6', className)}>{children}</div>
    </div>
  );
}
