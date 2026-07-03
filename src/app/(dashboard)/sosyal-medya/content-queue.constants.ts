// Sabitler ve tipler — client/server her ikisi de import edebilir (next/headers yok)

export type ContentPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TWITCH' | 'X';
export type ContentStatus   = 'HAZIRLANIYOR' | 'HAZIR' | 'YAYINLANDI';

export interface ContentQueueItem {
  id: string;
  title: string;
  platform: ContentPlatform;
  content_type: string;
  status: ContentStatus;
  planned_date: string | null;
  published_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentQueueInput {
  title: string;
  platform: ContentPlatform;
  content_type: string;
  status?: ContentStatus;
  planned_date?: string | null;
  notes?: string | null;
  created_by: string;
}

export interface UpdateContentQueueInput {
  title?: string;
  platform?: ContentPlatform;
  content_type?: string;
  status?: ContentStatus;
  planned_date?: string | null;
  published_date?: string | null;
  notes?: string | null;
}

export const CONTENT_TYPES: Record<ContentPlatform, string[]> = {
  YOUTUBE:   ['Video', 'Short', 'Canlı'],
  INSTAGRAM: ['Reels', 'Gönderi', 'Hikaye', 'Canlı'],
  TWITCH:    ['Yayın', 'Klip'],
  X:         ['Tweet', 'Thread'],
};

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
