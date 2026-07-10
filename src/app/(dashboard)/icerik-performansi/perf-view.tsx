'use client';

/**
 * Shared performance view (YouTube + Instagram): view toggle (Liste / Kart),
 * genre + score filters, sortable list, compact card grid. Both grids adapt
 * their scored data into PerfRow[] and pass the server actions as callbacks —
 * single source of truth for the whole content-performance UI.
 */

import { useEffect, useMemo, useState, useTransition, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import {
  RefreshCw, List, LayoutGrid, Sparkles, ChevronUp, ChevronDown,
  Eye, ThumbsUp, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LABEL_META, type PerfLabel } from './perf.constants';

export interface PerfRow {
  key: string;
  actionId: string;
  thumbnail: string | null;
  title: string;
  url: string;
  views: number | null;
  likes: number;
  comments: number;
  date: string | null;
  genre: string;
  genreLocked: boolean;
  score: number | null;
  label: PerfLabel;
  hasComment: boolean;
}

interface GenreOption { value: string; label: string }

interface Props {
  rows: PerfRow[];
  genreOptions: GenreOption[];
  thumbAspect: 'video' | 'square';
  emptyText: string;
  syncLabel: string;
  onSetGenre: (actionId: string, genre: string) => Promise<{ error?: string }>;
  onComment: (actionId: string) => Promise<{ comment?: string; error?: string }>;
  onSync: () => Promise<{ synced?: number; error?: string }>;
  commentsEnabled: boolean;
}

type SortKey = 'genre' | 'views' | 'likes' | 'score' | 'date';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return String(n);
}
function fmtFull(n: number): string {
  return n.toLocaleString('tr-TR');
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' });
}

const SCORE_FILTERS: { id: 'ALL' | PerfLabel; label: string }[] = [
  { id: 'ALL', label: 'Tüm skorlar' },
  { id: 'HIT', label: LABEL_META.HIT.text },
  { id: 'GOOD', label: LABEL_META.GOOD.text },
  { id: 'AVERAGE', label: LABEL_META.AVERAGE.text },
  { id: 'FLOP', label: LABEL_META.FLOP.text },
  { id: 'COLLECTING', label: LABEL_META.COLLECTING.text },
];

export function PerfView(props: Props) {
  const { rows, genreOptions, thumbAspect, emptyText, syncLabel, onSetGenre, onComment, onSync, commentsEnabled } = props;

  const [view, setView] = useState<'list' | 'card'>('list');

  // The list is a wide table — start phones on the card grid instead. Runs
  // after mount so the server and first client render still agree.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setView('card');
  }, []);
  const [genreFilter, setGenreFilter] = useState<'ALL' | string>('ALL');
  const [scoreFilter, setScoreFilter] = useState<'ALL' | PerfLabel>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [syncing, startSync] = useTransition();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Optimistic per-row overrides (genre + commented state)
  const [genreOverride, setGenreOverride] = useState<Record<string, string>>({});
  const [lockedOverride, setLockedOverride] = useState<Record<string, boolean>>({});
  const [commented, setCommented] = useState<Record<string, boolean>>({});

  const genreLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of genreOptions) m.set(g.value, g.label);
    return m;
  }, [genreOptions]);

  const genreOf = (r: PerfRow) => genreOverride[r.key] ?? r.genre;
  const lockedOf = (r: PerfRow) => lockedOverride[r.key] ?? r.genreLocked;
  const commentedOf = (r: PerfRow) => commented[r.key] ?? r.hasComment;

  const genreCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of rows) c.set(genreOf(r), (c.get(genreOf(r)) ?? 0) + 1);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, genreOverride]);

  const filtered = useMemo(() => {
    const arr = rows.filter(
      (r) => (scoreFilter === 'ALL' || r.label === scoreFilter) && (genreFilter === 'ALL' || genreOf(r) === genreFilter)
    );
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...arr].sort((a, b) => {
      let d = 0;
      if (sortKey === 'genre') d = (genreLabel.get(genreOf(a)) ?? '').localeCompare(genreLabel.get(genreOf(b)) ?? '', 'tr');
      else if (sortKey === 'views') d = (a.views ?? 0) - (b.views ?? 0);
      else if (sortKey === 'likes') d = a.likes - b.likes;
      else if (sortKey === 'score') d = (a.score ?? -1) - (b.score ?? -1);
      else d = new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime();
      if (d === 0) d = (b.score ?? -1) - (a.score ?? -1); // stable-ish tiebreak by score
      return d * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, scoreFilter, genreFilter, sortKey, sortDir, genreOverride, genreLabel]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'genre' ? 'asc' : 'desc'); }
  }

  function changeGenre(r: PerfRow, next: string) {
    const prevG = genreOf(r), prevL = lockedOf(r);
    setGenreOverride((m) => ({ ...m, [r.key]: next }));
    setLockedOverride((m) => ({ ...m, [r.key]: true }));
    onSetGenre(r.actionId, next).then((res) => {
      if (res.error) {
        setGenreOverride((m) => ({ ...m, [r.key]: prevG }));
        setLockedOverride((m) => ({ ...m, [r.key]: prevL }));
      }
    });
  }

  function handleSync() {
    setSyncMsg(null);
    startSync(async () => {
      const res = await onSync();
      setSyncMsg(res.error ? `Hata: ${res.error}` : `${res.synced} içerik güncellendi`);
    });
  }

  const showViews = rows.some((r) => r.views != null);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[var(--radius-md)] p-0.5" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
          {([['list', List, 'Liste'], ['card', LayoutGrid, 'Kart']] as const).map(([id, Icon, label]) => {
            const active = view === id;
            return (
              <button key={id} onClick={() => setView(id)}
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors"
                style={active ? { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', boxShadow: '0 1px 3px rgba(27,37,89,.10)' } : { color: 'var(--color-text-secondary)' }}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            );
          })}
        </div>

        <Select value={genreFilter} onChange={setGenreFilter}>
          <option value="ALL">Tüm türler ({rows.length})</option>
          {genreOptions.map((g) => <option key={g.value} value={g.value}>{g.label} ({genreCounts.get(g.value) ?? 0})</option>)}
        </Select>
        <Select value={scoreFilter} onChange={(v) => setScoreFilter(v as 'ALL' | PerfLabel)}>
          {SCORE_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {syncMsg && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{syncMsg}</span>}
          <Button onClick={handleSync} size="sm" variant="secondary" disabled={syncing}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Senkronize ediliyor…' : syncLabel}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-10 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{rows.length === 0 ? emptyText : 'Bu filtreyle eşleşen içerik yok.'}</p>
        </div>
      ) : view === 'list' ? (
        <ListView rows={filtered} showViews={showViews} thumbAspect={thumbAspect} sortKey={sortKey} sortDir={sortDir}
          toggleSort={toggleSort} genreOptions={genreOptions} genreOf={genreOf} lockedOf={lockedOf} commentedOf={commentedOf}
          changeGenre={changeGenre} onComment={onComment} setCommented={setCommented} commentsEnabled={commentsEnabled} total={rows.length} />
      ) : (
        <CardView rows={filtered} thumbAspect={thumbAspect} genreOptions={genreOptions} genreOf={genreOf} lockedOf={lockedOf}
          commentedOf={commentedOf} changeGenre={changeGenre} onComment={onComment} setCommented={setCommented} commentsEnabled={commentsEnabled} />
      )}
    </div>
  );
}

// ── Reusable bits ────────────────────────────────────────────────────────────

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold outline-none"
      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
      {children}
    </select>
  );
}

function GenreSelect({ value, locked, options, onChange }: { value: string; locked: boolean; options: GenreOption[]; onChange: (v: string) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        title={locked ? 'Tür elle atandı (senkronda korunur)' : 'Otomatik atanan tür — değiştirebilirsin'}
        className="max-w-[9.5rem] rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-semibold outline-none"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid ${locked ? 'var(--color-accent)' : 'var(--color-border)'}`, color: locked ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
        {options.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
      </select>
      {locked && <span title="Elle atandı" style={{ color: 'var(--color-accent)', fontSize: 9 }}>●</span>}
    </span>
  );
}

function ScoreBadge({ label, score }: { label: PerfLabel; score: number | null }) {
  const m = LABEL_META[label];
  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: m.bg, color: m.color, whiteSpace: 'nowrap' }}>{m.text}</span>
      {score != null && <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{score.toFixed(2)}x</span>}
    </span>
  );
}

function CommentButton({ done, disabled, onClick }: { done: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled || done}
      title={done ? 'Yorum eklendi' : disabled ? 'ANTHROPIC_API_KEY gerekli' : 'Claude ile yorumla'}
      className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      style={done
        ? { backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)', border: '1px solid var(--color-success-muted)' }
        : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
      <Sparkles className="h-3.5 w-3.5" /> {done ? 'Yorum var' : 'Yorumla'}
    </button>
  );
}

interface SharedRowProps {
  rows: PerfRow[];
  thumbAspect: 'video' | 'square';
  genreOptions: GenreOption[];
  genreOf: (r: PerfRow) => string;
  lockedOf: (r: PerfRow) => boolean;
  commentedOf: (r: PerfRow) => boolean;
  changeGenre: (r: PerfRow, next: string) => void;
  onComment: (actionId: string) => Promise<{ comment?: string; error?: string }>;
  setCommented: Dispatch<SetStateAction<Record<string, boolean>>>;
  commentsEnabled: boolean;
}

// ── List view ────────────────────────────────────────────────────────────────

function SortHeader({ label, active, dir, onClick, align }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void; align?: 'right' }) {
  const Chev = dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th onClick={onClick} className="cursor-pointer select-none px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider"
      style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)', textAlign: align ?? 'left', whiteSpace: 'nowrap' }}>
      <span className="inline-flex items-center gap-1" style={{ flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {label} <Chev className="h-3 w-3" style={{ opacity: active ? 1 : 0.35 }} />
      </span>
    </th>
  );
}

function ListView(props: SharedRowProps & {
  showViews: boolean; sortKey: SortKey; sortDir: 'asc' | 'desc'; toggleSort: (k: SortKey) => void; total: number;
}) {
  const { rows, showViews, thumbAspect, sortKey, sortDir, toggleSort, genreOptions, genreOf, lockedOf, commentedOf, changeGenre, onComment, setCommented, commentsEnabled, total } = props;
  const thumbCls = thumbAspect === 'video' ? 'h-[34px] w-[60px]' : 'h-[40px] w-[40px]';

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)]" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 920 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ width: 74 }} />
              <th className="px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Başlık</th>
              <SortHeader label="Tür" active={sortKey === 'genre'} dir={sortDir} onClick={() => toggleSort('genre')} />
              {showViews && <SortHeader label="İzlenme" active={sortKey === 'views'} dir={sortDir} onClick={() => toggleSort('views')} align="right" />}
              <SortHeader label="Beğeni" active={sortKey === 'likes'} dir={sortDir} onClick={() => toggleSort('likes')} align="right" />
              <SortHeader label="Skor" active={sortKey === 'score'} dir={sortDir} onClick={() => toggleSort('score')} />
              <SortHeader label="Tarih" active={sortKey === 'date'} dir={sortDir} onClick={() => toggleSort('date')} align="right" />
              <th className="px-3.5 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} style={{ backgroundColor: i % 2 ? 'var(--color-table-row-even)' : 'var(--color-table-row-odd)', borderBottom: '1px solid var(--color-border)' }}>
                <td className="py-2 pl-3.5">
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.thumbnail
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={r.thumbnail} alt="" loading="lazy" className={`${thumbCls} rounded-[var(--radius-sm)] object-cover`} />
                      : <div className={`${thumbCls} rounded-[var(--radius-sm)]`} style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />}
                  </a>
                </td>
                <td className="px-3.5 py-2">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="block max-w-[360px] truncate text-[13px] font-semibold hover:underline" style={{ color: 'var(--color-text-primary)' }}>{r.title}</a>
                </td>
                <td className="px-3.5 py-2"><GenreSelect value={genreOf(r)} locked={lockedOf(r)} options={genreOptions} onChange={(v) => changeGenre(r, v)} /></td>
                {showViews && <td className="px-3.5 py-2 text-right font-mono text-[12.5px]" style={{ color: 'var(--color-text-primary)' }}>{r.views != null ? fmtFull(r.views) : '—'}</td>}
                <td className="px-3.5 py-2 text-right font-mono text-[12.5px]" style={{ color: 'var(--color-text-primary)' }}>{fmtFull(r.likes)}</td>
                <td className="px-3.5 py-2"><ScoreBadge label={r.label} score={r.score} /></td>
                <td className="px-3.5 py-2 text-right font-mono text-[12px]" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                <td className="px-3.5 py-2 text-right">
                  <CommentButton done={commentedOf(r)} disabled={!commentsEnabled}
                    onClick={() => onComment(r.actionId).then((res) => { if (res.comment) setCommented((m) => ({ ...m, [r.key]: true })); })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-6 px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-table-row-even)', color: 'var(--color-text-secondary)' }}>
        <span>Toplam <b style={{ color: 'var(--color-text-primary)' }}>{total}</b></span>
        <span>Gösterilen <b style={{ color: 'var(--color-text-primary)' }}>{rows.length}</b></span>
      </div>
    </div>
  );
}

// ── Card view (compact) ──────────────────────────────────────────────────────

function CardView(props: SharedRowProps) {
  const { rows, thumbAspect, genreOptions, genreOf, lockedOf, commentedOf, changeGenre, onComment, setCommented, commentsEnabled } = props;
  const aspect = thumbAspect === 'video' ? 'aspect-video' : 'aspect-square';
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col overflow-hidden rounded-[var(--radius-lg)]"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="relative block">
            {r.thumbnail
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={r.thumbnail} alt="" loading="lazy" className={`${aspect} w-full object-cover`} />
              : <div className={`${aspect} w-full`} style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />}
            <span className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: LABEL_META[r.label].bg, color: LABEL_META[r.label].color, backdropFilter: 'blur(4px)' }}>{LABEL_META[r.label].text}</span>
          </a>
          <div className="flex flex-1 flex-col gap-1.5 p-2.5">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-[12px] font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{r.title}</a>
            <GenreSelect value={genreOf(r)} locked={lockedOf(r)} options={genreOptions} onChange={(v) => changeGenre(r, v)} />
            <div className="flex items-center gap-2.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {r.views != null && <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {fmt(r.views)}</span>}
              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {fmt(r.likes)}</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {fmt(r.comments)}</span>
              <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(r.date)}</span>
            </div>
            <div className="mt-auto pt-1">
              <button onClick={() => onComment(r.actionId).then((res) => { if (res.comment) setCommented((m) => ({ ...m, [r.key]: true })); })}
                disabled={!commentsEnabled || commentedOf(r)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-1.5 text-[11px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={commentedOf(r)
                  ? { backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }
                  : { backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                <Sparkles className="h-3 w-3" /> {commentedOf(r) ? 'Yorum var' : 'Yorumla'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
