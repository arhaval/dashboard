/** Fikir Havuzu — client-safe types & labels (no server imports). */

import type { PerfLabel } from '../icerik-performansi/perf.constants';

export type IdeaCategory = 'CONTENT' | 'BUSINESS' | 'STRATEGY';
export type IdeaStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type VoteType = 'UP' | 'DOWN' | 'UNSURE';
export type SuggestPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'X';

/** One platform the idea's content was published on. */
export interface PlatformOutcome {
  platform: string;               // YOUTUBE | INSTAGRAM | TIKTOK | X | TWITCH
  url: string | null;
  views: number | null;           // Instagram has no per-post views
  likes: number | null;
  comments: number | null;
  /** YouTube only: views / genre average, and the resulting label. */
  score: number | null;
  label: PerfLabel | null;
}

/** Real published performance of the content this idea became. */
export interface IdeaOutcome {
  total_views: number;
  platforms: PlatformOutcome[];
  /** YouTube label/score when the content went to YouTube. */
  label: PerfLabel | null;
  score: number | null;
}

export interface VoteCounts {
  up: number;
  down: number;
  unsure: number;
}

/** A voter row — only ever sent to admins. */
export interface VoterDetail {
  name: string;
  vote: VoteType;
}

/** Idea DTO shaped per role: author_name/voters are null for non-admins. */
export interface IdeaDTO {
  id: string;
  title: string;
  summary: string | null;
  category: IdeaCategory;
  status: IdeaStatus;
  ai_comment: string | null;
  ai_score: number | null;
  ai_genre: string | null;
  content_queue_id: string | null;
  suggested_platforms: SuggestPlatform[];
  suggested_format: string | null;
  /** Fikrin izleyiciyi neyle yakaladığı; eski kayıtlarda null. */
  hook_type: HookType | null;
  /** Tek satırlık gerekçe: bu kanca neden tutar. */
  why_it_works: string | null;
  created_at: string;
  counts: VoteCounts;
  my_vote: VoteType | null;
  /** True when the viewer wrote this idea — lets them delete it without
   *  revealing the author to anyone else. */
  is_mine: boolean;
  /** Set once the idea's content was published and linked to a video. */
  outcome: IdeaOutcome | null;
  author_name: string | null;   // admin only
  voters: VoterDetail[] | null;  // admin only
}

export const CATEGORY_META: Record<IdeaCategory, { label: string; bg: string; color: string }> = {
  CONTENT:  { label: 'İçerik',   bg: 'var(--color-accent-muted)',  color: 'var(--color-accent)' },
  BUSINESS: { label: 'İş',       bg: 'var(--color-info-muted)',    color: 'var(--color-info)' },
  STRATEGY: { label: 'Strateji', bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
};

export const CATEGORY_OPTIONS: { value: IdeaCategory; label: string }[] = [
  { value: 'CONTENT', label: 'İçerik' },
  { value: 'BUSINESS', label: 'İş' },
  { value: 'STRATEGY', label: 'Strateji' },
];

export const VOTE_META: Record<VoteType, { label: string; color: string; bg: string }> = {
  UP:     { label: 'Olumlu',    color: 'var(--color-success)', bg: 'var(--color-success-muted)' },
  DOWN:   { label: 'Olumsuz',   color: 'var(--color-error)',   bg: 'var(--color-error-muted)' },
  UNSURE: { label: 'Kararsızım', color: 'var(--color-warning)', bg: 'var(--color-warning-muted)' },
};

export const SUGGEST_PLATFORM_OPTIONS: { value: SuggestPlatform; label: string }[] = [
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'X', label: 'X' },
];

export const SUGGEST_PLATFORM_LABELS: Record<SuggestPlatform, string> = {
  YOUTUBE: 'YouTube', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', X: 'X',
};

export const SUGGEST_FORMATS = ['Uzun Video', 'Short', 'Reels', 'Gönderi', 'Canlı'] as const;

export const STATUS_META: Record<IdeaStatus, { label: string; bg: string; color: string }> = {
  OPEN:     { label: 'Havuzda',   bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  APPROVED: { label: 'Aktarıldı', bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
  REJECTED: { label: 'Reddedildi', bg: 'var(--color-error-muted)',  color: 'var(--color-error)' },
  ARCHIVED: { label: 'Arşiv',      bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-muted)' },
};

/** Board filters. Default is "Havuzda" so decided/archived ideas don't pile up. */
export const STATUS_FILTERS: { id: 'ALL' | IdeaStatus; label: string }[] = [
  { id: 'OPEN',     label: 'Havuzda' },
  { id: 'APPROVED', label: 'Aktarıldı' },
  { id: 'REJECTED', label: 'Reddedildi' },
  { id: 'ARCHIVED', label: 'Arşiv' },
  { id: 'ALL',      label: 'Tümü' },
];

// ── Kanca tipi ──────────────────────────────────────────────────────────────
// Fikrin izleyiciyi NEYLE yakaladığı. "Neden tutar" bu seçimin gerekçesidir.
// Değerler veritabanındaki CHECK kısıtıyla aynı (migration 20260919_idea_hook).

export type HookType = 'KNOWN_NAME_DEBATE' | 'KNOWN_NAME_NEW_INFO' | 'CURRENT_NEWS' | 'SYSTEM_EXPLAINER';

export const HOOK_TYPE_LABELS: Record<HookType, string> = {
  KNOWN_NAME_DEBATE: 'Tanınan isim + hatırlanan tartışma',
  KNOWN_NAME_NEW_INFO: 'Tanınan isim, yeni bilgi',
  CURRENT_NEWS: 'Güncel haber',
  SYSTEM_EXPLAINER: 'Sistem/kural anlatımı',
};

/** Seçim listesi sırası = etiket tanım sırası (tek kaynak). */
export const HOOK_TYPES = Object.keys(HOOK_TYPE_LABELS) as HookType[];

/** "Neden tutar" tek satır: kısa kalsın ki detayda bir bakışta okunsun. */
export const WHY_IT_WORKS_MAX = 160;

/** Filtrede tipi seçilmemiş fikirler — eski kayıtları bulup etiketlemek için. */
export const HOOK_FILTER_NONE = 'NONE';
export type HookFilter = 'ALL' | HookType | typeof HOOK_FILTER_NONE;

/** Formdan ya da veritabanından gelen değeri tipe oturtur; bilinmeyen değer null. */
export function parseHookType(raw: unknown): HookType | null {
  return typeof raw === 'string' && (HOOK_TYPES as string[]).includes(raw) ? (raw as HookType) : null;
}

/** "Neden tutar": kırpılır, tek satıra indirilir; boşsa null. */
export function normalizeWhyItWorks(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

export function matchesHookFilter(hook: HookType | null, filter: HookFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === HOOK_FILTER_NONE) return hook == null;
  return hook === filter;
}

/**
 * Kanca alanlarının veritabanına gidecek hâli.
 *
 * Kolonlar migration çalıştırılmadan önce yoksa, bu alanları boş bırakan
 * kayıtlar yine yazılabilsin diye boş değer gönderilmez. Kolonun var olduğu
 * biliniyorsa (mevcut satırda anahtar var) null da gönderilir ki alan
 * temizlenebilsin.
 */
export function hookColumns(
  input: { hookType: HookType | null; whyItWorks: string | null },
  columnsExist: boolean
): { hook_type?: HookType | null; why_it_works?: string | null } {
  const out: { hook_type?: HookType | null; why_it_works?: string | null } = {};
  if (columnsExist || input.hookType != null) out.hook_type = input.hookType;
  if (columnsExist || input.whyItWorks != null) out.why_it_works = input.whyItWorks;
  return out;
}

/**
 * Fikir İçerik Planı'na aktarılırken karta yazılan not. Metni yazacak kişi
 * fikrin NEDEN seçildiğini görsün diye kanca tipi ve gerekçesi de taşınır.
 * Bu alanlar boşsa not eskisiyle birebir aynıdır (özet + AI yorumu).
 */
export function transferNote(input: {
  summary: string | null;
  hookType: HookType | null;
  whyItWorks: string | null;
  aiComment: string | null;
}): string | null {
  const hookBlock = [
    input.hookType ? `Kanca: ${HOOK_TYPE_LABELS[input.hookType]}` : null,
    input.whyItWorks ? `Neden tutar: ${input.whyItWorks}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const parts = [
    input.summary?.trim() || null,
    hookBlock || null,
    input.aiComment ? `AI: ${input.aiComment}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('\n\n') : null;
}
