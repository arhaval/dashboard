/**
 * Instagram media read + scoring.
 * Score is computed in code: likes / average likes of the SAME content type.
 * A type with fewer than MIN_SAMPLE_PER_TYPE posts is "collecting" (no score).
 */

import { createClient } from '@/lib/supabase/server';
import { MIN_SAMPLE_PER_TYPE, scoreToLabel } from '@/app/(dashboard)/icerik-performansi/perf.constants';
import type {
  InstagramMedia,
  ScoredMedia,
  IgContentType,
} from '@/app/(dashboard)/icerik-performansi/ig-perf.constants';

export const instagramPerformanceService = {
  async getAllScored(): Promise<ScoredMedia[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('instagram_media')
      .select('*')
      .order('published_at', { ascending: false });

    if (error || !data) return [];
    const media = data as InstagramMedia[];

    const byType = new Map<IgContentType, InstagramMedia[]>();
    for (const m of media) {
      const arr = byType.get(m.content_type) ?? [];
      arr.push(m);
      byType.set(m.content_type, arr);
    }

    const typeCount = new Map<IgContentType, number>();
    const typeAvg = new Map<IgContentType, number>();
    for (const [type, arr] of byType) {
      typeCount.set(type, arr.length);
      const withLikes = arr.filter((m) => Number(m.like_count) > 0);
      const avg =
        withLikes.length > 0
          ? withLikes.reduce((s, m) => s + Number(m.like_count), 0) / withLikes.length
          : 0;
      typeAvg.set(type, avg);
    }

    return media.map((m): ScoredMedia => {
      const count = typeCount.get(m.content_type) ?? 0;
      if (count < MIN_SAMPLE_PER_TYPE) {
        return { ...m, score: null, label: 'COLLECTING', type_avg_likes: null };
      }
      const avg = typeAvg.get(m.content_type) ?? 0;
      const score = avg > 0 ? Number(m.like_count) / avg : 0;
      return { ...m, score, label: scoreToLabel(score), type_avg_likes: avg };
    });
  },
};
