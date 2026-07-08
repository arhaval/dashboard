/**
 * Instagram İçerik Performansı — client-safe types & constants.
 * Reuses the shared label/score logic from perf.constants.
 */

import type { PerfLabel } from './perf.constants';

export type IgContentType = 'reels' | 'post' | 'carousel' | 'video';

export interface InstagramMedia {
  id: string;
  media_id: string;
  caption: string | null;
  content_type: IgContentType;
  permalink: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  like_count: number;
  comment_count: number;
  claude_comment: string | null;
  commented_at: string | null;
  synced_at: string | null;
}

export interface ScoredMedia extends InstagramMedia {
  /** likes / average-likes-of-same-type. null while the type is collecting data. */
  score: number | null;
  label: PerfLabel;
  type_avg_likes: number | null;
}

export const IG_TYPE_LABELS: Record<IgContentType, string> = {
  reels: 'Reels',
  post: 'Gönderi',
  carousel: 'Karusel',
  video: 'Video',
};
