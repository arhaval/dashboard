/**
 * Formatters & Badge Utilities
 * Centralized formatting and styling functions used across the app.
 * Eliminates duplicated format/badge logic in page components.
 */

import { tr } from '@/lib/i18n';
import {
  WORK_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  ROLE_COLORS,
  TRANSACTION_TYPE_COLORS,
} from '@/constants';
import type {
  WorkType,
  WorkStatus,
  ContentLength,
  PaymentStatus,
  UserRole,
  TransactionType,
  MetricsPlatform,
} from '@/types';

// =============================================================================
// Number / Currency / Date Formatters
// =============================================================================

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
});

/** Format a number as Turkish Lira (e.g. ₺1.250,00) */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

/** Format a date string to Turkish locale (e.g. 15 Oca 2026) */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('tr-TR', dateFormatOptions);
}

/** Format a large number with K/M suffix (e.g. 1.2K, 3.5M) */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace('.0', '') + 'K';
  }
  return num.toLocaleString('tr-TR');
}

// =============================================================================
// Label Getters (enum → Turkish display text)
// =============================================================================

/** Get Turkish label for work type */
export function getWorkTypeLabel(type: WorkType): string {
  return tr.workItem.type[type];
}

/** Get Turkish label for work status */
export function getWorkStatusLabel(status: WorkStatus): string {
  return tr.workItem.status[status];
}

/** Get Turkish label for content length */
export function getContentLengthLabel(length: ContentLength): string {
  return tr.workItem.contentLength[length];
}

/** Get Turkish label for user role */
export function getRoleLabel(role: UserRole): string {
  return tr.roles[role];
}

/** Get Turkish label for transaction type */
export function getTransactionTypeLabel(type: TransactionType): string {
  return tr.transaction.type[type];
}

/** Get display label for platform */
export function getPlatformLabel(platform: MetricsPlatform): string {
  return tr.social.platforms[platform];
}

// =============================================================================
// Badge Class Getters (enum → Tailwind classes)
// =============================================================================

/** Badge classes for work status */
export function getWorkStatusBadgeClass(status: WorkStatus): string {
  return WORK_STATUS_COLORS[status];
}

/** Badge classes for payment status */
export function getPaymentStatusBadgeClass(status: PaymentStatus): string {
  return PAYMENT_STATUS_COLORS[status];
}

/** Badge classes for user role */
export function getRoleBadgeClass(role: UserRole): string {
  return ROLE_COLORS[role];
}

/** Badge classes for transaction type */
export function getTransactionTypeBadgeClass(type: TransactionType): string {
  return TRANSACTION_TYPE_COLORS[type];
}

/** Badge classes for social platform */
export function getPlatformBadgeClass(platform: MetricsPlatform): string {
  const map: Record<MetricsPlatform, string> = {
    TWITCH: 'bg-purple-500/10 text-purple-400',
    YOUTUBE: 'bg-red-500/10 text-red-400',
    INSTAGRAM: 'bg-pink-500/10 text-pink-400',
    X: 'bg-blue-500/10 text-blue-400',
  };
  return map[platform];
}

// =============================================================================
// Growth Status Badge
// =============================================================================

export type GrowthStatus = 'growing' | 'stable' | 'declining';

interface GrowthBadge {
  icon: string;
  label: string;
  className: string;
}

export function getGrowthBadge(status: GrowthStatus): GrowthBadge {
  const map: Record<GrowthStatus, GrowthBadge> = {
    growing: {
      icon: '\u25B2',
      label: tr.social.growth.growing,
      className: 'text-[var(--color-success)]',
    },
    stable: {
      icon: '\u25CF',
      label: tr.social.growth.stable,
      className: 'text-[var(--color-warning)]',
    },
    declining: {
      icon: '\u25BC',
      label: tr.social.growth.declining,
      className: 'text-[var(--color-error)]',
    },
  };
  return map[status];
}
