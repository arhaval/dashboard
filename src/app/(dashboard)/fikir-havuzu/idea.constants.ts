/** Fikir Havuzu — client-safe types & labels (no server imports). */

export type IdeaCategory = 'CONTENT' | 'BUSINESS' | 'STRATEGY';
export type IdeaStatus = 'OPEN' | 'APPROVED' | 'REJECTED';
export type VoteType = 'UP' | 'DOWN' | 'UNSURE';

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
  created_at: string;
  counts: VoteCounts;
  my_vote: VoteType | null;
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

export const STATUS_META: Record<IdeaStatus, { label: string; bg: string; color: string }> = {
  OPEN:     { label: 'Havuzda',   bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  APPROVED: { label: 'Aktarıldı', bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
  REJECTED: { label: 'Reddedildi', bg: 'var(--color-error-muted)',  color: 'var(--color-error)' },
};
