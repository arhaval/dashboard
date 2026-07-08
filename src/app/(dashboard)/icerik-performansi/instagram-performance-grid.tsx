'use client';

import { useMemo, useState, useTransition } from 'react';
import { RefreshCw, Heart, MessageSquare, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LABEL_META, type PerfLabel } from './perf.constants';
import { IG_TYPE_LABELS, type ScoredMedia } from './ig-perf.constants';
import { syncInstagramNow, commentOnMedia } from './ig-perf-actions';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return String(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FILTERS: { id: 'ALL' | PerfLabel; label: string }[] = [
  { id: 'ALL', label: 'Tümü' },
  { id: 'HIT', label: LABEL_META.HIT.text },
  { id: 'GOOD', label: LABEL_META.GOOD.text },
  { id: 'AVERAGE', label: LABEL_META.AVERAGE.text },
  { id: 'FLOP', label: LABEL_META.FLOP.text },
  { id: 'COLLECTING', label: LABEL_META.COLLECTING.text },
];

function MediaCard({ media, commentsEnabled }: { media: ScoredMedia; commentsEnabled: boolean }) {
  const [comment, setComment] = useState<string | null>(media.claude_comment);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const meta = LABEL_META[media.label];

  function handleComment() {
    setError(null);
    startTransition(async () => {
      const res = await commentOnMedia(media.media_id);
      if (res.error) setError(res.error);
      else if (res.comment) setComment(res.comment);
    });
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--radius-lg)]"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
    >
      <a href={media.permalink ?? '#'} target="_blank" rel="noopener noreferrer" className="relative block">
        {media.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.thumbnail_url} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
        ) : (
          <div className="aspect-square w-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
        )}
        <span
          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: meta.bg, color: meta.color, backdropFilter: 'blur(4px)' }}
        >
          {meta.text}
        </span>
        <span
          className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: 'rgba(11,20,55,0.65)', color: '#fff' }}
        >
          {IG_TYPE_LABELS[media.content_type]}
        </span>
      </a>

      <div className="flex flex-1 flex-col p-3">
        {media.caption && (
          <p className="mb-2 line-clamp-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {media.caption}
          </p>
        )}
        <div className="mb-2 flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {formatNumber(media.like_count)}</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {formatNumber(media.comment_count)}</span>
          <span className="ml-auto" style={{ color: 'var(--color-text-muted)' }}>{formatDate(media.published_at)}</span>
        </div>
        {media.score != null && (
          <p className="mb-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Tür ortalamasının <span style={{ color: meta.color, fontWeight: 600 }}>{media.score.toFixed(2)}x</span>'i beğeni
          </p>
        )}

        <div className="mt-auto pt-2">
          {comment ? (
            <div className="rounded-[var(--radius-sm)] p-2.5 text-[12px] leading-relaxed" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
                <Sparkles className="h-3 w-3" /> Claude yorumu
              </span>
              {comment}
            </div>
          ) : (
            <button
              onClick={handleComment}
              disabled={!commentsEnabled || isPending}
              title={commentsEnabled ? 'Claude ile yorumla' : 'ANTHROPIC_API_KEY gerekli — key eklenince aktifleşir'}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-1.5 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isPending ? 'Yorumlanıyor…' : 'Yorumla'}
            </button>
          )}
          {error && <p className="mt-1 text-[11px]" style={{ color: 'var(--color-error)' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function InstagramPerformanceGrid({ media, commentsEnabled }: { media: ScoredMedia[]; commentsEnabled: boolean }) {
  const [filter, setFilter] = useState<'ALL' | PerfLabel>('ALL');
  const [syncing, startSync] = useTransition();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: media.length };
    for (const m of media) c[m.label] = (c[m.label] ?? 0) + 1;
    return c;
  }, [media]);

  const filtered = filter === 'ALL' ? media : media.filter((m) => m.label === filter);

  function handleSync() {
    setSyncMsg(null);
    startSync(async () => {
      const res = await syncInstagramNow();
      setSyncMsg(res.error ? `Hata: ${res.error}` : `${res.synced} gönderi güncellendi`);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors"
                style={active ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                {f.label} <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{syncMsg}</span>}
          <Button onClick={handleSync} size="sm" variant="secondary" disabled={syncing}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Senkronize ediliyor…' : 'Şimdi Senkronize Et'}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-10 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {media.length === 0 ? 'Henüz gönderi yok. "Şimdi Senkronize Et" ile Instagram\'dan çek.' : 'Bu filtreyle eşleşen gönderi yok.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => <MediaCard key={m.id} media={m} commentsEnabled={commentsEnabled} />)}
        </div>
      )}
    </div>
  );
}
