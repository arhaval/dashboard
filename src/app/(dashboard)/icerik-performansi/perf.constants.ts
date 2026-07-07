/**
 * İçerik Performansı — client-safe types & constants.
 * NO server imports here (used by client components).
 */

export type ContentType = 'video' | 'short' | 'live';

export type PerfLabel = 'HIT' | 'GOOD' | 'AVERAGE' | 'FLOP' | 'COLLECTING';

export interface VideoPerformance {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  content_type: ContentType;
  duration_seconds: number;
  claude_comment: string | null;
  commented_at: string | null;
  synced_at: string | null;
}

export interface ScoredVideo extends VideoPerformance {
  /** views / average-views-of-same-type. null when the type is still collecting data. */
  score: number | null;
  label: PerfLabel;
  /** average views for this content type (null if collecting) */
  type_avg_views: number | null;
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: 'Video',
  short: 'Short',
  live: 'Canlı Yayın',
};

export interface LabelMeta {
  text: string;
  bg: string;
  color: string;
}

export const LABEL_META: Record<PerfLabel, LabelMeta> = {
  HIT:        { text: '🔥 Patladı',       bg: 'var(--color-accent-muted)',  color: 'var(--color-accent)'  },
  GOOD:       { text: '✅ Başarılı',      bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
  AVERAGE:    { text: '➖ Ortalama',      bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  FLOP:       { text: '❌ Tutmadı',       bg: 'var(--color-error-muted)',   color: 'var(--color-error)'   },
  COLLECTING: { text: '📊 Veri topluyor', bg: 'var(--color-info-muted)',    color: 'var(--color-info)'    },
};

/** Minimum videos of a given type before we trust the score. */
export const MIN_SAMPLE_PER_TYPE = 5;

export function scoreToLabel(score: number): Exclude<PerfLabel, 'COLLECTING'> {
  if (score >= 1.5) return 'HIT';
  if (score >= 1.2) return 'GOOD';
  if (score >= 0.8) return 'AVERAGE';
  return 'FLOP';
}
