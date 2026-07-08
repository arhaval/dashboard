/**
 * Instagram İçerik Performansı — client-safe types & constants.
 * Reuses the shared label/score logic from perf.constants.
 */

import type { PerfLabel } from './perf.constants';

export type IgContentType = 'reels' | 'post' | 'carousel' | 'video';

/** Instagram genre (what the post is) — the scoring bucket. */
export type IgGenre = 'news' | 'reels' | 'visual' | 'post';

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
  genre: IgGenre | null;
  genre_locked: boolean;
  claude_comment: string | null;
  commented_at: string | null;
  synced_at: string | null;
}

export interface ScoredMedia extends InstagramMedia {
  /** Effective genre (stored, or auto-classified when unset). Never null. */
  effective_genre: IgGenre;
  /** likes / average-likes-of-same-genre. null while the genre is collecting data. */
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

export const IG_GENRE_LABELS: Record<IgGenre, string> = {
  news: 'Haber/Duyuru',
  reels: 'Reels',
  visual: 'Görsel/Tanıtım',
  post: 'Gönderi',
};

export const IG_GENRES: IgGenre[] = ['news', 'reels', 'visual', 'post'];

function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c')
    .replace(/ö/g, 'o').replace(/ü/g, 'u');
}

/**
 * Auto-assign an Instagram post's genre from its caption + format.
 * Reels wins by format; otherwise keyword heuristics (news → visual → post).
 */
export function classifyIgGenre(caption: string | null, contentType: IgContentType): IgGenre {
  if (contentType === 'reels' || contentType === 'video') return 'reels';
  const c = norm(caption ?? '');

  if (
    c.includes('transfer') || c.includes('duyurdu') || c.includes('duyuru') ||
    c.includes('acikladi') || c.includes('aciklama') || c.includes('resmi') ||
    c.includes('imzaladi') || c.includes('katildi') || c.includes('ayrildi') || c.includes('bomba')
  ) {
    return 'news';
  }
  if (
    contentType === 'carousel' || c.includes('tanitim') || c.includes('kadro') ||
    c.includes('forma') || c.includes('sponsor') || c.includes('hos geldin') || c.includes('aramizda')
  ) {
    return 'visual';
  }
  return 'post';
}
