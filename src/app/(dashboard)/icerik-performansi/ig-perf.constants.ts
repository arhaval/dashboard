/**
 * Instagram İçerik Performansı — client-safe types & constants.
 * Reuses the shared label/score logic from perf.constants.
 */

import type { PerfLabel } from './perf.constants';

export type IgContentType = 'reels' | 'post' | 'carousel' | 'video';

/**
 * Instagram genre = the CONTENT/topic (the scoring bucket), NOT the format.
 * Format (Reels/Gönderi/Karusel) stays as `content_type`, shown as a separate badge.
 */
export type IgGenre = 'news' | 'interview' | 'analysis' | 'match' | 'story' | 'celebration' | 'general';

export interface InstagramMedia {
  id: string;
  media_id: string;
  caption: string | null;
  content_type: IgContentType;
  permalink: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
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
  interview: 'Röportaj',
  analysis: 'Analiz/Tartışma',
  match: 'Maç/Turnuva',
  story: 'Oyuncu/Takım Hikayesi',
  celebration: 'Kutlama/Motivasyon',
  general: 'Genel',
};

export const IG_GENRES: IgGenre[] = ['news', 'interview', 'analysis', 'match', 'story', 'celebration', 'general'];

function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c')
    .replace(/ö/g, 'o').replace(/ü/g, 'u');
}

/**
 * Auto-assign an Instagram post's genre from its caption (topic-based, like
 * YouTube). Format (Reels/Gönderi) is NOT used here — it is kept separately
 * as content_type. Keyword order mirrors the YouTube taxonomy.
 */
export function classifyIgGenre(caption: string | null): IgGenre {
  const c = norm(caption ?? '');

  // Oyuncu/Takım Hikayesi (biyografi/belgesel — önce yakala)
  if (
    c.includes('hikayesi') || c.includes('hikaye') || c.includes('yukselis') ||
    c.includes('adanmislik') || c.includes('efsane') || c.includes('yolculug') ||
    c.includes('yolculuk') || c.includes('belgesel') || c.includes('biyografi')
  ) {
    return 'story';
  }
  // Haber/Duyuru
  if (
    c.includes('transfer') || c.includes('duyurdu') || c.includes('duyuru') ||
    c.includes('acikladi') || c.includes('kattidan') || c.includes('kadrosuna katti') ||
    c.includes('katti') || c.includes('imzaladi') || c.includes('resmi') ||
    c.includes('aramiza katildi') || c.includes('bomba')
  ) {
    return 'news';
  }
  // Röportaj
  if (
    c.includes('roportaj') || c.includes('konustu') || c.includes('konusuyor') ||
    c.includes('anlatti') || c.includes('ozel') || c.includes('sozleri') ||
    c.includes('kaptan') || c.includes('mikrofon')
  ) {
    return 'interview';
  }
  // Analiz/Tartışma (soru & tartışma)
  if (
    c.includes('bozulabilir') || c.includes('neden') || c.includes('nasil') ||
    c.includes('sizce') || c.includes('analiz') || c.includes('tartisma') ||
    c.includes('yorumla') || c.trim().endsWith('?')
  ) {
    return 'analysis';
  }
  // Maç/Turnuva
  if (
    /\bvs\b/.test(c) || /\bmac\b/.test(c) || c.includes(' maci') || c.includes('karsilasma') ||
    c.includes('turnuva') || c.includes('final') || c.includes('galibiyet') ||
    c.includes('maglubiyet') || c.includes('skor')
  ) {
    return 'match';
  }
  // Kutlama/Motivasyon
  if (
    c.includes('tesekkur') || c.includes('tebrik') || c.includes('kutlama') ||
    c.includes('kutluyoruz') || c.includes('motivasyon') || c.includes('gurur') ||
    c.includes('sampiyon') || c.includes('iyi ki')
  ) {
    return 'celebration';
  }
  return 'general';
}
