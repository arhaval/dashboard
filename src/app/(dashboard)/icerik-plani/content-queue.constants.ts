// Sabitler ve tipler — client/server her ikisi de import edebilir (next/headers yok)

export type ContentPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'TWITCH' | 'X';
export type ContentStatus   = 'HAZIRLANIYOR' | 'HAZIR' | 'YAYINLANDI';

export interface ContentQueueItem {
  id: string;
  title: string;
  platforms: ContentPlatform[];
  content_type: string;
  status: ContentStatus;
  content_text: string | null;
  voice_url: string | null;
  video_url: string | null;
  has_text: boolean;
  has_voice: boolean;
  has_video: boolean;
  planned_date: string | null;
  published_date: string | null;
  notes: string | null;
  created_by: string | null;
  assigned_to: string | null;
  voiced_by: string | null;
  edited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentQueueInput {
  title: string;
  platforms: ContentPlatform[];
  content_type: string;
  status?: ContentStatus;
  content_text?: string | null;
  voice_url?: string | null;
  video_url?: string | null;
  has_text?: boolean;
  has_voice?: boolean;
  has_video?: boolean;
  planned_date?: string | null;
  notes?: string | null;
  created_by: string;
}

export interface UpdateContentQueueInput {
  title?: string;
  platforms?: ContentPlatform[];
  content_type?: string;
  status?: ContentStatus;
  content_text?: string | null;
  voice_url?: string | null;
  video_url?: string | null;
  has_text?: boolean;
  has_voice?: boolean;
  has_video?: boolean;
  planned_date?: string | null;
  published_date?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  voiced_by?: string | null;
  edited_by?: string | null;
}

// Tüm platformlarda geçerli genel format tipleri
export const CONTENT_FORMATS = [
  'Video',
  'Short / Reels',
  'Gönderi / Post',
  'Tweet / Thread',
  'Canlı Yayın',
  'Hikaye / Story',
] as const;

export const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  YOUTUBE:   'YouTube',
  INSTAGRAM: 'Instagram',
  TIKTOK:    'TikTok',
  TWITCH:    'Twitch',
  X:         'X (Twitter)',
};

/**
 * Where a card can be published. `auto` platforms have an API integration, so
 * their metrics are resolved live and must not be typed in by hand.
 */
export const PUBLISH_PLATFORMS: { value: ContentPlatform; label: string; auto: boolean }[] = [
  { value: 'YOUTUBE',   label: 'YouTube',   auto: true  },
  { value: 'INSTAGRAM', label: 'Instagram', auto: true  },
  { value: 'TIKTOK',    label: 'TikTok',    auto: false },
  { value: 'X',         label: 'X (Twitter)', auto: false },
  { value: 'TWITCH',    label: 'Twitch',    auto: false },
];

/** One platform a card was published to. */
export interface PublicationInput {
  platform: ContentPlatform;
  url: string | null;
  external_id: string | null;
  /** Only for platforms without an API integration (TikTok / X / Twitch). */
  views: number | null;
  likes: number | null;
}

/** Instagram permalinks are /p/{shortcode}/ or /reel/{shortcode}/. */
export function extractInstagramShortcode(input: string): string | null {
  const m = input.trim().match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  HAZIRLANIYOR: 'Hazırlanıyor',
  HAZIR:        'Hazır',
  YAYINLANDI:   'Yayınlandı',
};

// ── Pipeline stage (derived) + role responsibility ──────────────────────────
// Same derivation as the İçerik Planı kanban. Used to auto-surface content on
// each member's profile by the role responsible for the current stage.

export type ContentStage = 'METIN' | 'SES' | 'EDITOR' | 'HAZIR' | 'YAYINLANDI';

export const STAGE_LABELS_MAP: Record<ContentStage, string> = {
  METIN:      'Metin Yazılıyor',
  SES:        'Ses Bekleniyor',
  EDITOR:     'Editörde',
  HAZIR:      'Hazır',
  YAYINLANDI: 'Yayınlandı',
};

export function deriveStage(item: Pick<ContentQueueItem, 'status' | 'has_text' | 'has_voice' | 'has_video'>): ContentStage {
  if (item.status === 'YAYINLANDI') return 'YAYINLANDI';
  if (item.has_video) return 'HAZIR';
  if (item.has_voice) return 'EDITOR';
  if (item.has_text) return 'SES';
  return 'METIN';
}

/**
 * Pull the 11-char video id out of any YouTube URL form (watch?v=, youtu.be/,
 * /shorts/, /live/), or accept a bare id. Returns null when nothing matches.
 */
export function extractYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Roles that may write/edit content cards and hand off the Metin stage. */
export const CONTENT_EDITOR_ROLES = ['ADMIN', 'PUBLISHER', 'YOUTUBER'] as const;

/** Which pipeline stages a given user role is responsible for. */
export const ROLE_STAGES: Record<string, ContentStage[]> = {
  PUBLISHER: ['METIN'],   // metni yazan
  YOUTUBER:  ['METIN'],   // metni yazan + seslendirmen atayan
  VOICE:     ['SES'],     // seslendiren
  EDITOR:    ['EDITOR'],  // kurgulayan
};

export const PLATFORM_COLORS: Record<ContentPlatform, { bg: string; color: string }> = {
  YOUTUBE:   { bg: 'rgba(255,0,0,0.12)',    color: '#FF4444' },
  INSTAGRAM: { bg: 'rgba(225,48,108,0.12)', color: '#E1306C' },
  TIKTOK:    { bg: 'rgba(0,0,0,0.08)',      color: '#111111' },
  TWITCH:    { bg: 'rgba(145,70,255,0.12)', color: '#9146FF' },
  X:         { bg: 'rgba(161,161,161,0.12)',color: '#A1A1A1' },
};
