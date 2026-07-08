/**
 * Instagram media read + scoring.
 * Score is computed in code: likes / average likes of the SAME content type.
 * A type with fewer than MIN_SAMPLE_PER_TYPE posts is "collecting" (no score).
 */

import { createClient } from '@/lib/supabase/server';
import { MIN_SAMPLE_PER_TYPE, scoreToLabel } from '@/app/(dashboard)/icerik-performansi/perf.constants';
import {
  classifyIgGenre,
  type InstagramMedia,
  type ScoredMedia,
  type IgGenre,
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

    // Effective genre = stored genre (respects manual lock) or auto-classified.
    const genreOf = (m: InstagramMedia): IgGenre =>
      m.genre ?? classifyIgGenre(m.caption, m.content_type);

    const byGenre = new Map<IgGenre, InstagramMedia[]>();
    for (const m of media) {
      const g = genreOf(m);
      const arr = byGenre.get(g) ?? [];
      arr.push(m);
      byGenre.set(g, arr);
    }

    const genreCount = new Map<IgGenre, number>();
    const genreAvg = new Map<IgGenre, number>();
    for (const [genre, arr] of byGenre) {
      genreCount.set(genre, arr.length);
      const withLikes = arr.filter((m) => Number(m.like_count) > 0);
      const avg =
        withLikes.length > 0
          ? withLikes.reduce((s, m) => s + Number(m.like_count), 0) / withLikes.length
          : 0;
      genreAvg.set(genre, avg);
    }

    return media.map((m): ScoredMedia => {
      const g = genreOf(m);
      const count = genreCount.get(g) ?? 0;
      if (count < MIN_SAMPLE_PER_TYPE) {
        return { ...m, effective_genre: g, score: null, label: 'COLLECTING', type_avg_likes: null };
      }
      const avg = genreAvg.get(g) ?? 0;
      const score = avg > 0 ? Number(m.like_count) / avg : 0;
      return { ...m, effective_genre: g, score, label: scoreToLabel(score), type_avg_likes: avg };
    });
  },
};
