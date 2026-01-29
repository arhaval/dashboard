/**
 * PageShell Component
 * Wrapper for all dashboard pages providing consistent structure
 *
 * Every page MUST be wrapped in PageShell
 * Provides: page header, breadcrumbs, action button slot, content spacing
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  /** Page title displayed in the header */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional action buttons (top right) */
  actions?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Additional class names for the content wrapper */
  className?: string;
}

export function PageShell({
  title,
  description,
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Page Header */}
      <div
        className={cn(
          'flex flex-col gap-4',
          'border-b border-[var(--color-border)]',
          'bg-[var(--color-bg-primary)]',
          'px-6 py-6',
          'sm:flex-row sm:items-center sm:justify-between'
        )}
      >
        <div>
          <h1 className="text-display text-2xl text-[var(--color-text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3">{actions}</div>
        )}
      </div>

      {/* Page Content */}
      <div className={cn('flex-1 p-6', className)}>{children}</div>
    </div>
  );
}
