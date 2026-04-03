/**
 * Breadcrumb Component
 * Displays current page location derived from the URL pathname.
 * Used inside the Header.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

// Human-readable segment labels
const segmentLabels: Record<string, string> = {
  '': 'Dashboard',
  'team': 'Ekip',
  'work-items': 'İş Kayıtları',
  'payments': 'Ödemeler',
  'finance': 'Finans',
  'social': 'Sosyal Medya',
  'matches': 'Maçlar',
  'operations': 'Operasyon',
  'stats': 'İstatistikler',
  'teams': 'Takımlar',
  'reports': 'Raporlar',
  'new': 'Yeni',
};

function getLabel(segment: string): string {
  return segmentLabels[segment] ?? segment;
}

export function Breadcrumb() {
  const pathname = usePathname();

  // Build breadcrumb items from path segments
  const segments = pathname.split('/').filter(Boolean);

  // Root → Dashboard
  const crumbs = [{ label: 'Dashboard', href: '/' }];

  let accumulated = '';
  for (const seg of segments) {
    accumulated += `/${seg}`;
    // Skip UUIDs (detail pages)
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seg
      );
    crumbs.push({
      label: isUuid ? 'Detay' : getLabel(seg),
      href: accumulated,
    });
  }

  if (crumbs.length === 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="h-3 w-3 text-[var(--color-text-muted)]" />
            )}
            {isLast ? (
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
