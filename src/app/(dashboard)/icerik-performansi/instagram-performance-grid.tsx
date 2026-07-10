'use client';

import { PerfView, type PerfRow } from './perf-view';
import { IG_GENRE_LABELS, IG_GENRES, type ScoredMedia, type IgGenre } from './ig-perf.constants';
import { syncInstagramNow, commentOnMedia, setMediaGenre, setMediaScript } from './ig-perf-actions';
import { extractInstagramShortcode } from '../icerik-plani/content-queue.constants';

const GENRE_OPTIONS = IG_GENRES.map((g) => ({ value: g, label: IG_GENRE_LABELS[g] }));

export function InstagramPerformanceGrid({ media, commentsEnabled, authorsByExternalId }: { media: ScoredMedia[]; commentsEnabled: boolean; authorsByExternalId: Record<string, string> }) {
  const rows: PerfRow[] = media.map((m) => ({
    key: m.id,
    actionId: m.media_id,
    thumbnail: m.thumbnail_url,
    title: m.caption?.trim() || '(açıklama yok)',
    url: m.permalink ?? '#',
    views: m.view_count ?? null,
    likes: m.like_count,
    comments: m.comment_count,
    date: m.published_at,
    genre: m.effective_genre,
    genreLocked: m.genre_locked,
    score: m.score,
    label: m.label,
    hasComment: Boolean(m.claude_comment),
    script: m.script,
    author: (() => { const c = m.permalink ? extractInstagramShortcode(m.permalink) : null; return c ? authorsByExternalId[c] ?? null : null; })(),
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
      onSetScript={setMediaScript}
      commentsEnabled={commentsEnabled}
    />
  );
}
