'use client';

import { PerfView, type PerfRow } from './perf-view';
import { IG_GENRE_LABELS, IG_GENRES, type ScoredMedia, type IgGenre } from './ig-perf.constants';
import { syncInstagramNow, commentOnMedia, setMediaGenre } from './ig-perf-actions';

const GENRE_OPTIONS = IG_GENRES.map((g) => ({ value: g, label: IG_GENRE_LABELS[g] }));

export function InstagramPerformanceGrid({ media, commentsEnabled }: { media: ScoredMedia[]; commentsEnabled: boolean }) {
  const rows: PerfRow[] = media.map((m) => ({
    key: m.id,
    actionId: m.media_id,
    thumbnail: m.thumbnail_url,
    title: m.caption?.trim() || '(açıklama yok)',
    url: m.permalink ?? '#',
    views: null,
    likes: m.like_count,
    comments: m.comment_count,
    date: m.published_at,
    genre: m.effective_genre,
    genreLocked: m.genre_locked,
    score: m.score,
    label: m.label,
    hasComment: Boolean(m.claude_comment),
  }));

  return (
    <PerfView
      rows={rows}
      genreOptions={GENRE_OPTIONS}
      thumbAspect="square"
      emptyText={'Henüz gönderi yok. "Şimdi Senkronize Et" ile Instagram’dan çek.'}
      syncLabel="Şimdi Senkronize Et"
      onSetGenre={(id, g) => setMediaGenre(id, g as IgGenre)}
      onComment={commentOnMedia}
      onSync={syncInstagramNow}
      commentsEnabled={commentsEnabled}
    />
  );
}
