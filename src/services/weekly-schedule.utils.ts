/**
 * Weekly Schedule — Client-safe constants & helpers
 * Bu dosya hem server hem client'ta kullanılabilir (Supabase import yok)
 */

export type WeekActivity =
  | 'STREAM'
  | 'YOUTUBE_VIDEO'
  | 'YOUTUBE_SHORTS'
  | 'INSTAGRAM_REELS'
  | 'INSTAGRAM_POST'
  | 'TWEET'
  | 'REST';

export interface DaySchedule {
  id: string;
  day_of_week: number;
  activities: WeekActivity[];
  notes: string | null;
}

export const ACTIVITY_LABELS: Record<WeekActivity, string> = {
  STREAM: 'Yayın',
  YOUTUBE_VIDEO: 'YouTube Video',
  YOUTUBE_SHORTS: 'YouTube Shorts',
  INSTAGRAM_REELS: 'Instagram Reels',
  INSTAGRAM_POST: 'Instagram Gönderi',
  TWEET: 'Twitter/X',
  REST: 'Dinlenme',
};

export const ACTIVITY_COLORS: Record<WeekActivity, string> = {
  STREAM: 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/20',
  YOUTUBE_VIDEO: 'bg-red-50 text-red-600 border-red-200',
  YOUTUBE_SHORTS: 'bg-red-50 text-red-500 border-red-100',
  INSTAGRAM_REELS: 'bg-pink-50 text-pink-600 border-pink-200',
  INSTAGRAM_POST: 'bg-purple-50 text-purple-600 border-purple-200',
  TWEET: 'bg-sky-50 text-sky-600 border-sky-200',
  REST: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)]',
};

export const DAY_LABELS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const ALL_ACTIVITIES: WeekActivity[] = [
  'STREAM',
  'YOUTUBE_VIDEO',
  'YOUTUBE_SHORTS',
  'INSTAGRAM_REELS',
  'INSTAGRAM_POST',
  'TWEET',
  'REST',
];

export function formatScheduleForSharing(schedule: DaySchedule[]): string {
  const lines = ['📅 HAFTALIK İÇERİK TAKVİMİ\n'];
  for (const day of schedule) {
    const label = DAY_LABELS[day.day_of_week - 1];
    if (day.activities.length === 0) {
      lines.push(`${label.padEnd(12)} → —`);
    } else {
      const acts = day.activities.map((a) => ACTIVITY_LABELS[a]).join(' + ');
      lines.push(`${label.padEnd(12)} → ${acts}`);
    }
    if (day.notes) lines.push(`${''.padEnd(15)}📝 ${day.notes}`);
  }
  return lines.join('\n');
}
