/**
 * Video performance read + scoring service.
 * Score is computed HERE in code (never by Claude):
 *   score = this video's views / average views of the SAME content type.
 * A content type with fewer than MIN_SAMPLE_PER_TYPE videos is "collecting"
 * (no score) to avoid misleading numbers from tiny samples.
 */

import { createClient } from '@/lib/supabase/server';
import {
  MIN_SAMPLE_PER_TYPE,
  scoreToLabel,
  type VideoPerformance,
  type ScoredVideo,
  type ContentType,
} from '@/app/(dashboard)/icerik-performansi/perf.constants';

export const videoPerformanceService = {
  async getAllScored(): Promise<ScoredVideo[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('video_performance')
      .select('*')
      .order('published_at', { ascending: false });

    if (error || !data) return [];

    const videos = data as VideoPerformance[];

    // Group by content type; average excludes 0-view items (upcoming/unwatched)
    const byType = new Map<ContentType, VideoPerformance[]>();
    for (const v of videos) {
      const arr = byType.get(v.content_type) ?? [];
      arr.push(v);
      byType.set(v.content_type, arr);
    }

    const typeCount = new Map<ContentType, number>();
    const typeAvg = new Map<ContentType, number>();
    for (const [type, arr] of byType) {
      typeCount.set(type, arr.length);
      const watched = arr.filter((v) => Number(v.view_count) > 0);
      const avg =
        watched.length > 0
          ? watched.reduce((s, v) => s + Number(v.view_count), 0) / watched.length
          : 0;
      typeAvg.set(type, avg);
    }

    return videos.map((v): ScoredVideo => {
      const count = typeCount.get(v.content_type) ?? 0;
      if (count < MIN_SAMPLE_PER_TYPE) {
        return { ...v, score: null, label: 'COLLECTING', type_avg_views: null };
      }
      const avg = typeAvg.get(v.content_type) ?? 0;
      const score = avg > 0 ? Number(v.view_count) / avg : 0;
      return { ...v, score, label: scoreToLabel(score), type_avg_views: avg };
    });
  },

  async getById(videoId: string): Promise<VideoPerformance | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('video_performance')
      .select('*')
      .eq('video_id', videoId)
      .single();
    return (data as VideoPerformance) ?? null;
  },
};
