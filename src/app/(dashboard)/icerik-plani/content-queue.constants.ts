// Sabitler ve tipler — client/server her ikisi de import edebilir (next/headers yok)

export type ContentPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TWITCH' | 'X';
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
  TWITCH:    'Twitch',
  X:         'X (Twitter)',
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  HAZIRLANIYOR: 'Hazırlanıyor',
  HAZIR:        'Hazır',
  YAYINLANDI:   'Yayınlandı',
};

export const PLATFORM_COLORS: Record<ContentPlatform, { bg: string; color: string }> = {
  YOUTUBE:   { bg: 'rgba(255,0,0,0.12)',    color: '#FF4444' },
  INSTAGRAM: { bg: 'rgba(225,48,108,0.12)', color: '#E1306C' },
  TWITCH:    { bg: 'rgba(145,70,255,0.12)', color: '#9146FF' },
  X:         { bg: 'rgba(161,161,161,0.12)',color: '#A1A1A1' },
};
