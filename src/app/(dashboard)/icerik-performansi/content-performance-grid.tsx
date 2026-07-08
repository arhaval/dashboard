'use client';

import { PerfView, type PerfRow } from './perf-view';
import { VIDEO_GENRE_LABELS, VIDEO_GENRES, type ScoredVideo, type VideoGenre } from './perf.constants';
import { syncVideosNow, commentOnVideo, setVideoGenre } from './perf-actions';

const GENRE_OPTIONS = VIDEO_GENRES.map((g) => ({ value: g, label: VIDEO_GENRE_LABELS[g] }));

export function ContentPerformanceGrid({ videos, commentsEnabled }: { videos: ScoredVideo[]; commentsEnabled: boolean }) {
  const rows: PerfRow[] = videos.map((v) => ({
    key: v.id,
    actionId: v.video_id,
    thumbnail: v.thumbnail_url,
    title: v.title,
    url: `https://youtu.be/${v.video_id}`,
    views: v.view_count,
    likes: v.like_count,
    comments: v.comment_count,
    date: v.published_at,
    genre: v.effective_genre,
    genreLocked: v.genre_locked,
    score: v.score,
    label: v.label,
    hasComment: Boolean(v.claude_comment),
  }));

  return (
    <PerfView
      rows={rows}
      genreOptions={GENRE_OPTIONS}
      thumbAspect="video"
      emptyText={'Henüz video yok. "Şimdi Senkronize Et" ile YouTube’dan çek.'}
      syncLabel="Şimdi Senkronize Et"
      onSetGenre={(id, g) => setVideoGenre(id, g as VideoGenre)}
      onComment={commentOnVideo}
      onSync={syncVideosNow}
      commentsEnabled={commentsEnabled}
    />
  );
}
