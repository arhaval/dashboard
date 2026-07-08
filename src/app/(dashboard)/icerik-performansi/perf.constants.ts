/**
 * İçerik Performansı — client-safe types & constants.
 * NO server imports here (used by client components).
 */

export type ContentType = 'video' | 'short' | 'live';

/** Content genre (what the video is about) — the scoring bucket. */
export type VideoGenre = 'match' | 'interview' | 'analysis' | 'story' | 'clip' | 'general';

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
  genre: VideoGenre | null;
  genre_locked: boolean;
  claude_comment: string | null;
  commented_at: string | null;
  synced_at: string | null;
}

export interface ScoredVideo extends VideoPerformance {
  /** Effective genre (stored genre, or auto-classified when unset). Never null. */
  effective_genre: VideoGenre;
  /** views / average-views-of-same-genre. null while the genre is collecting data. */
  score: number | null;
  label: PerfLabel;
  /** average views for this genre (null if collecting) */
  type_avg_views: number | null;
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: 'Video',
  short: 'Short',
  live: 'Canlı Yayın',
};

export const VIDEO_GENRE_LABELS: Record<VideoGenre, string> = {
  match: 'Maç Yayını',
  interview: 'Röportaj',
  analysis: 'Analiz/Tartışma',
  story: 'Oyuncu/Takım Hikayesi',
  clip: 'Klip',
  general: 'Genel',
};

export const VIDEO_GENRES: VideoGenre[] = ['match', 'interview', 'analysis', 'story', 'clip', 'general'];

/** A non-live upload at least this long is treated as a documentary/story. */
const DOC_MIN_SECONDS = 1200; // 20 min

/** Normalize Turkish text for keyword matching (lowercase, ASCII-ish). */
function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c')
    .replace(/ö/g, 'o').replace(/ü/g, 'u');
}

/** True when the title reads as a biography/documentary ("… Hikayesi"). */
function isStoryTitle(t: string): boolean {
  return (
    t.includes('hikayesi') || t.includes('hikaye') || t.includes('yukselis') ||
    t.includes('adanmislik') || t.includes('efsane') || t.includes('yolculug') ||
    t.includes('yolculuk') || t.includes('belgesel') || t.includes('biyografi')
  );
}

/**
 * Auto-assign a YouTube video's genre from its title + format (+ duration).
 * Format wins for shorts (→ clip). "Story" (biography/documentary) is caught
 * by keywords, or by documentary length for long non-live uploads.
 */
export function classifyVideoGenre(
  title: string,
  contentType: ContentType,
  durationSeconds = 0
): VideoGenre {
  if (contentType === 'short') return 'clip';
  const t = norm(title);

  // Oyuncu/Takım Hikayesi (en değerli tür — önce yakala)
  if (isStoryTitle(t)) return 'story';

  // Maç yayını: "X vs Y", karşılaşma
  if (/\bvs\b/.test(t) || /\bv[.\s]/.test(t) || t.includes('karsilasma') || t.includes(' maci') || /\bmac\b/.test(t)) {
    return 'match';
  }
  // Röportaj
  if (
    t.includes('roportaj') || t.includes('konustu') || t.includes('konusuyor') ||
    t.includes('anlatti') || t.includes('ozel') || t.includes('sorulari') || t.includes('itiraf')
  ) {
    return 'interview';
  }
  // Analiz / Tartışma (soru cümlesi dahil)
  if (
    t.includes('neden') || t.includes('nasil') || t.includes('analiz') ||
    t.includes('tartisma') || t.includes('degerlendirme') || t.trim().endsWith('?')
  ) {
    return 'analysis';
  }
  // Belgesel formatındaki uzun videolar (canlı yayın hariç)
  if (contentType !== 'live' && durationSeconds >= DOC_MIN_SECONDS) return 'story';

  return 'general';
}

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
