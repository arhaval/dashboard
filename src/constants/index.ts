/**
 * Arhaval Dashboard - Constants
 * Central location for all enum values, options, and configuration constants.
 *
 * RULES:
 * - All hardcoded enum values MUST be imported from here
 * - Labels come from i18n (tr.ts), NOT duplicated here
 * - Types come from types/index.ts, NOT duplicated here
 */

import type {
  WorkType,
  WorkStatus,
  ContentLength,
  UserRole,
  TransactionType,
  PaymentStatus,
  MetricsPlatform,
  CS2MatchStatus,
} from '@/types';

// =============================================================================
// Enum Value Arrays (for iteration, validation, includes checks)
// =============================================================================

export const WORK_TYPES: readonly WorkType[] = ['STREAM', 'VOICE', 'EDIT'] as const;

export const WORK_STATUSES: readonly WorkStatus[] = ['DRAFT', 'APPROVED', 'PAID'] as const;

export const CONTENT_LENGTHS: readonly ContentLength[] = ['SHORT', 'LONG'] as const;

export const USER_ROLES: readonly UserRole[] = ['ADMIN', 'PUBLISHER', 'EDITOR', 'VOICE'] as const;

export const TRANSACTION_TYPES: readonly TransactionType[] = ['INCOME', 'EXPENSE'] as const;

export const PAYMENT_STATUSES: readonly PaymentStatus[] = ['PENDING', 'PAID', 'CANCELLED'] as const;

export const METRICS_PLATFORMS: readonly MetricsPlatform[] = ['TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X'] as const;

// =============================================================================
// Status Transitions (business logic)
// =============================================================================

export const WORK_STATUS_TRANSITIONS: Record<WorkStatus, readonly WorkStatus[]> = {
  DRAFT: ['APPROVED'],
  APPROVED: ['DRAFT', 'PAID'],
  PAID: [],
} as const;

// =============================================================================
// Transaction Categories
// =============================================================================

export const EXPENSE_CATEGORIES = [
  'Ekip Ödemeleri',
  'Avanslar',
  'Operasyon',
  'Ekipman',
  'Diğer',
] as const;

export const INCOME_CATEGORIES = [
  'Sponsorluk',
  'Reklam Gelirleri',
  'Diğer',
] as const;

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as const;

export const CATEGORIES_BY_TYPE: Record<TransactionType, readonly string[]> = {
  EXPENSE: EXPENSE_CATEGORIES,
  INCOME: INCOME_CATEGORIES,
} as const;

// =============================================================================
// Badge / Status Styling
// =============================================================================

export const WORK_STATUS_COLORS: Record<WorkStatus, string> = {
  DRAFT: 'bg-yellow-500/15 text-yellow-400',
  APPROVED: 'bg-blue-500/15 text-blue-400',
  PAID: 'bg-green-500/15 text-green-400',
} as const;

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  PAID: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
} as const;

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-500/15 text-red-400',
  PUBLISHER: 'bg-blue-500/15 text-blue-400',
  EDITOR: 'bg-purple-500/15 text-purple-400',
  VOICE: 'bg-green-500/15 text-green-400',
} as const;

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: 'bg-green-500/15 text-green-400',
  EXPENSE: 'bg-red-500/15 text-red-400',
} as const;

// =============================================================================
// Social Goals - Metrics Per Platform
// =============================================================================

export const GOAL_METRICS_BY_PLATFORM: Record<MetricsPlatform, { key: string; label: string }[]> = {
  TWITCH: [
    { key: 'followers_total', label: 'Takipçi' },
    { key: 'avg_viewers', label: 'Ort. İzleyici' },
    { key: 'peak_viewers', label: 'Zirve İzleyici' },
    { key: 'unique_viewers', label: 'Tekil İzleyici' },
    { key: 'live_views', label: 'Canlı İzlenme' },
    { key: 'unique_chatters', label: 'Tekil Sohbet' },
    { key: 'subs_total', label: 'Abone' },
  ],
  YOUTUBE: [
    { key: 'subscribers_total', label: 'Abone' },
    { key: 'video_views', label: 'Video İzlenme' },
    { key: 'shorts_views', label: 'Shorts İzlenme' },
    { key: 'live_views', label: 'Canlı İzlenme' },
    { key: 'avg_live_viewers', label: 'Ort. Canlı İzleyici' },
    { key: 'peak_live_viewers', label: 'Zirve Canlı İzleyici' },
  ],
  INSTAGRAM: [
    { key: 'followers_total', label: 'Takipçi' },
    { key: 'views', label: 'Görüntülenme' },
    { key: 'likes', label: 'Beğeni' },
    { key: 'saves', label: 'Kaydetme' },
  ],
  X: [
    { key: 'followers_total', label: 'Takipçi' },
    { key: 'impressions', label: 'Gösterim' },
    { key: 'likes', label: 'Beğeni' },
    { key: 'profile_visits', label: 'Profil Ziyareti' },
  ],
} as const;

// =============================================================================
// CS2 Match System
// =============================================================================

export const CS2_MAPS = [
  'de_dust2',
  'de_mirage',
  'de_inferno',
  'de_nuke',
  'de_overpass',
  'de_ancient',
  'de_anubis',
  'de_vertigo',
] as const;

export const CS2_MATCH_STATUSES: readonly CS2MatchStatus[] = [
  'PENDING',
  'LIVE',
  'FINISHED',
  'CANCELLED',
] as const;

export const CS2_MATCH_STATUS_COLORS: Record<CS2MatchStatus, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  LIVE: 'bg-red-500/15 text-red-400',
  FINISHED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-neutral-500/15 text-neutral-400',
} as const;

// DatHost Integration
export const DATHOST_MAP_STATUSES = [
  'CREATED',
  'WAITING_PLAYERS',
  'LIVE',
  'FINISHED',
  'CANCELLED',
  'FAILED',
] as const;

export const DATHOST_MAP_STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500/15 text-blue-400',
  WAITING_PLAYERS: 'bg-yellow-500/15 text-yellow-400',
  LIVE: 'bg-red-500/15 text-red-400',
  FINISHED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-neutral-500/15 text-neutral-400',
  FAILED: 'bg-red-500/15 text-red-300',
} as const;

export const DATHOST_SERVER_STATUSES = ['IDLE', 'IN_MATCH', 'OFFLINE'] as const;

export const DATHOST_SERVER_STATUS_COLORS: Record<string, string> = {
  IDLE: 'bg-green-500/15 text-green-400',
  IN_MATCH: 'bg-red-500/15 text-red-400',
  OFFLINE: 'bg-neutral-500/15 text-neutral-400',
} as const;

export const DATHOST_POLL_INTERVAL_MS = 10_000;

// =============================================================================
// Pagination & Display Limits
// =============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  DASHBOARD_PREVIEW_ITEMS: 5,
  DASHBOARD_APPROVED_PREVIEW: 3,
  TABLE_INLINE_PREVIEW: 2,
  DETAIL_PAGE_ITEMS: 10,
  REPORT_SUGGESTIONS_LIMIT: 3,
} as const;

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULTS = {
  WORK_TYPE: 'STREAM' as WorkType,
  ROLE: 'PUBLISHER' as UserRole,
  STATUS: 'DRAFT' as WorkStatus,
} as const;
