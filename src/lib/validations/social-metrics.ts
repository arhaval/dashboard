/**
 * Social Metrics Validation Schemas
 */

import { z } from 'zod';
import { METRICS_PLATFORMS } from '@/constants';

const monthRegex = /^\d{4}-\d{2}$/;

export const socialMetricsBaseSchema = z.object({
  month: z.string().regex(monthRegex, 'Ay formatı YYYY-MM olmalıdır'),
  platform: z.enum(METRICS_PLATFORMS as unknown as [string, ...string[]], {
    message: 'Geçerli bir platform seçin',
  }),
  followers_total: z.coerce.number().min(0, 'Takipçi sayısı negatif olamaz'),
});

export const twitchMetricsSchema = socialMetricsBaseSchema.extend({
  platform: z.literal('TWITCH'),
  total_stream_time_minutes: z.coerce.number().min(0).optional(),
  avg_viewers: z.coerce.number().min(0).optional(),
  peak_viewers: z.coerce.number().min(0).optional(),
  unique_viewers: z.coerce.number().min(0).optional(),
  live_views: z.coerce.number().min(0).optional(),
  unique_chatters: z.coerce.number().min(0).optional(),
  subs_total: z.coerce.number().min(0).optional(),
});

export const youtubeMetricsSchema = socialMetricsBaseSchema.extend({
  platform: z.literal('YOUTUBE'),
  subscribers_total: z.coerce.number().min(0).optional(),
  video_views: z.coerce.number().min(0).optional(),
  shorts_views: z.coerce.number().min(0).optional(),
  live_views: z.coerce.number().min(0).optional(),
  total_likes: z.coerce.number().min(0).optional(),
  total_comments: z.coerce.number().min(0).optional(),
  avg_live_viewers: z.coerce.number().min(0).optional(),
  peak_live_viewers: z.coerce.number().min(0).optional(),
});

export const instagramMetricsSchema = socialMetricsBaseSchema.extend({
  platform: z.literal('INSTAGRAM'),
  views: z.coerce.number().min(0).optional(),
  likes: z.coerce.number().min(0).optional(),
  comments: z.coerce.number().min(0).optional(),
  saves: z.coerce.number().min(0).optional(),
  shares: z.coerce.number().min(0).optional(),
});

export const xMetricsSchema = socialMetricsBaseSchema.extend({
  platform: z.literal('X'),
  impressions: z.coerce.number().min(0).optional(),
  engagement_rate: z.coerce.number().min(0).optional(),
  likes: z.coerce.number().min(0).optional(),
  replies: z.coerce.number().min(0).optional(),
  profile_visits: z.coerce.number().min(0).optional(),
});

export const createSocialMetricsSchema = z.discriminatedUnion('platform', [
  twitchMetricsSchema,
  youtubeMetricsSchema,
  instagramMetricsSchema,
  xMetricsSchema,
]);

export type CreateSocialMetricsFormData = z.infer<typeof createSocialMetricsSchema>;
