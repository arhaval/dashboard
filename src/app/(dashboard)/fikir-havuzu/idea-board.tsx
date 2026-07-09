'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, ThumbsUp, ThumbsDown, HelpCircle, Sparkles, Trash2, ArrowRight, Users, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  CATEGORY_META, CATEGORY_OPTIONS, VOTE_META, STATUS_META,
  SUGGEST_PLATFORM_OPTIONS, SUGGEST_PLATFORM_LABELS, SUGGEST_FORMATS,
  type IdeaDTO, type IdeaCategory, type VoteType,
} from './idea.constants';
import { CONTENT_FORMATS, PLATFORM_LABELS, type ContentPlatform } from '../icerik-plani/content-queue.constants';
import { createIdea, voteIdea, deleteIdea, rejectIdea, approveIdea, evaluateIdea } from './actions';

const VOTE_BUTTONS: { type: VoteType; icon: typeof ThumbsUp }[] = [
  { type: 'UP', icon: ThumbsUp },
  { type: 'DOWN', icon: ThumbsDown },
  { type: 'UNSURE', icon: HelpCircle },
];

const card = { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' };

// ── Add-idea modal ───────────────────────────────────────────────────────────

function AddIdeaModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await createIdea(fd);
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0B1437]/50 backdrop-blur-sm" onClick={() => !isPending && onClose()} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] p-6" style={card}>
        <h3 className="mb-4 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Yeni Fikir</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Başlık <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <Input name="title" placeholder="örn. MAJ3R belgeseli 2. bölüm" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Özet / Metin</label>
            <textarea name="summary" rows={10} placeholder="Fikri özetle ya da tam metni yaz..."
              className="max-h-[50vh] w-full resize-y rounded-[var(--radius-sm)] px-3 py-2.5 text-sm leading-relaxed outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: 160 }} />
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Tek cümle de olur, detaylı senaryo/script de — sınır yok.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Kategori</label>
            <Select name="category" defaultValue="CONTENT">
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>

          {/* Optional suggestion (hint only — final choice at Aktar) */}
          <div className="rounded-[var(--radius-sm)] p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <p className="mb-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Önerilen Format / Platform <span style={{ color: 'var(--color-text-muted)' }}>(opsiyonel)</span></p>
            <div className="mb-2 flex flex-wrap gap-2">
              {SUGGEST_PLATFORM_OPTIONS.map((p) => (
                <label key={p.value} className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                  <input type="checkbox" name="suggested_platforms" value={p.value} className="accent-[var(--color-accent)]" /> {p.label}
                </label>
              ))}
            </div>
            <Select name="suggested_format" defaultValue="">
              <option value="">Format önerme</option>
              {SUGGEST_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Emin değilsen boş bırak — kesin karar &quot;Onayla → Aktar&quot;da verilir.</p>
          </div>

          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Fikri kimin yazdığını yalnızca admin görür.</p>
          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Ekleniyor…' : 'Havuza Ekle'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Transfer (approve) modal ─────────────────────────────────────────────────

// Map an idea's suggested format to a content_queue format value (prefill).
const SUGGEST_TO_FORMAT: Record<string, string> = {
  'Uzun Video': 'Video', 'Short': 'Short / Reels', 'Reels': 'Short / Reels',
  'Gönderi': 'Gönderi / Post', 'Canlı': 'Canlı Yayın',
};

function TransferModal({ idea, onClose }: { idea: IdeaDTO; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const platforms = Object.keys(PLATFORM_LABELS) as ContentPlatform[];

  // Prefill from the idea's suggestion where it maps to a content platform;
  // if nothing overlaps, default to YouTube. Admin can change freely.
  const suggested = idea.suggested_platforms as string[];
  const overlap = platforms.filter((p) => suggested.includes(p));
  const isChecked = (p: ContentPlatform) => (overlap.length > 0 ? overlap.includes(p) : p === 'YOUTUBE');
  const defaultFormat = (idea.suggested_format && SUGGEST_TO_FORMAT[idea.suggested_format]) || 'Video';
  const hasSuggestion = idea.suggested_platforms.length > 0 || Boolean(idea.suggested_format);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await approveIdea(idea.id, fd);
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0B1437]/50 backdrop-blur-sm" onClick={() => !isPending && onClose()} />
      <div className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] p-6" style={card}>
        <h3 className="mb-1 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>İçerik Planı&apos;na Aktar</h3>
        <p className="mb-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>Kart &quot;Metin Yazılıyor&quot; aşamasında açılır.</p>
        {hasSuggestion && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] p-2.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Fikir önerisi</span>
            {idea.suggested_platforms.map((p) => (
              <span key={p} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>{SUGGEST_PLATFORM_LABELS[p]}</span>
            ))}
            {idea.suggested_format && <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>{idea.suggested_format}</span>}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Platform(lar) <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                  <input type="checkbox" name="platforms" value={p} defaultChecked={isChecked(p)} className="accent-[var(--color-accent)]" />
                  {PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Format</label>
            <Select name="content_type" defaultValue={defaultFormat}>
              {CONTENT_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Aktarılıyor…' : 'Onayla → Aktar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Idea card ────────────────────────────────────────────────────────────────

function IdeaCard({ idea, isAdmin, commentsEnabled, onTransfer }: {
  idea: IdeaDTO; isAdmin: boolean; commentsEnabled: boolean; onTransfer: (idea: IdeaDTO) => void;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [comment, setComment] = useState<string | null>(idea.ai_comment);
  const [score, setScore] = useState<number | null>(idea.ai_score);
  const [error, setError] = useState<string | null>(null);
  const [showVoters, setShowVoters] = useState(false);
  const cat = CATEGORY_META[idea.category];

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => { const r = await fn(); if (r.error) setError(r.error); else router.refresh(); });
  }
  function handleVote(v: VoteType) { run(() => voteIdea(idea.id, v)); }
  function handleEvaluate() {
    setError(null);
    start(async () => {
      const r = await evaluateIdea(idea.id);
      if (r.error) setError(r.error);
      else { if (r.comment) setComment(r.comment); if (r.score !== undefined) setScore(r.score ?? null); }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] p-4" style={card}>
      {/* head */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: cat.bg, color: cat.color }}>{cat.label}</span>
        {idea.status !== 'OPEN' && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: STATUS_META[idea.status].bg, color: STATUS_META[idea.status].color }}>{STATUS_META[idea.status].label}</span>
        )}
        {isAdmin && idea.author_name && (
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>✍️ {idea.author_name}</span>
        )}
        {isAdmin && (
          <button onClick={() => { if (confirm('Fikri sil?')) run(() => deleteIdea(idea.id)); }} disabled={isPending}
            className="ml-auto rounded p-1 transition-colors hover:bg-red-500/10" title="Sil" style={{ color: 'var(--color-error)' }}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* body */}
      <div>
        <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{idea.title}</h3>
        {idea.summary && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{idea.summary}</p>}
        {(idea.suggested_platforms.length > 0 || idea.suggested_format) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Öneri</span>
            {idea.suggested_platforms.map((p) => (
              <span key={p} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>{SUGGEST_PLATFORM_LABELS[p]}</span>
            ))}
            {idea.suggested_format && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>{idea.suggested_format}</span>
            )}
          </div>
        )}
      </div>

      {/* votes */}
      <div className="flex flex-wrap items-center gap-2">
        {VOTE_BUTTONS.map(({ type, icon: Icon }) => {
          const active = idea.my_vote === type;
          const m = VOTE_META[type];
          const count = type === 'UP' ? idea.counts.up : type === 'DOWN' ? idea.counts.down : idea.counts.unsure;
          return (
            <button key={type} onClick={() => handleVote(type)} disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={active
                ? { backgroundColor: m.bg, color: m.color, border: `1px solid ${m.color}` }
                : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              <Icon className="h-3.5 w-3.5" /> {m.label} <span className="font-mono">{count}</span>
            </button>
          );
        })}
        {isAdmin && idea.voters && idea.voters.length > 0 && (
          <button onClick={() => setShowVoters((v) => !v)} className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <Users className="h-3 w-3" /> kim ne verdi
          </button>
        )}
      </div>
      {isAdmin && showVoters && idea.voters && (
        <div className="flex flex-wrap gap-1.5 rounded-[var(--radius-sm)] p-2" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          {idea.voters.length === 0 ? <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Henüz oy yok</span> :
            idea.voters.map((v, i) => (
              <span key={i} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: VOTE_META[v.vote].bg, color: VOTE_META[v.vote].color }}>{v.name}: {VOTE_META[v.vote].label}</span>
            ))}
        </div>
      )}

      {/* AI evaluation */}
      {comment ? (
        <div className="rounded-[var(--radius-sm)] p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}><Sparkles className="h-3 w-3" /> AI değerlendirme</span>
            {score != null && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>Tahmini tutma %{score}</span>}
          </div>
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{comment}</p>
        </div>
      ) : isAdmin ? (
        <button onClick={handleEvaluate} disabled={!commentsEnabled || isPending}
          title={commentsEnabled ? 'Claude ile değerlendir' : 'ANTHROPIC_API_KEY gerekli'}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-2 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
          <Sparkles className="h-3.5 w-3.5" /> {isPending ? 'Değerlendiriliyor…' : 'Değerlendir'}
        </button>
      ) : null}

      {error && <p className="text-[11px]" style={{ color: 'var(--color-error)' }}>{error}</p>}

      {/* admin decision */}
      {isAdmin && idea.status === 'OPEN' && (
        <div className="flex gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <Button size="sm" onClick={() => onTransfer(idea)} disabled={isPending} className="flex-1">
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Onayla → Aktar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run(() => rejectIdea(idea.id))} disabled={isPending}>
            <X className="mr-1 h-3.5 w-3.5" /> Reddet
          </Button>
        </div>
      )}
      {idea.status === 'APPROVED' && (
        <p className="text-[11px]" style={{ color: 'var(--color-success)' }}>İçerik Planı&apos;na aktarıldı — &quot;Metin Yazılıyor&quot; aşamasında.</p>
      )}
    </div>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export function IdeaBoard({ ideas, isAdmin, commentsEnabled }: { ideas: IdeaDTO[]; isAdmin: boolean; commentsEnabled: boolean }) {
  const [filter, setFilter] = useState<'ALL' | IdeaCategory>('ALL');
  const [adding, setAdding] = useState(false);
  const [transferIdea, setTransferIdea] = useState<IdeaDTO | null>(null);

  const visible = ideas.filter((i) => filter === 'ALL' || i.category === filter);
  const counts: Record<string, number> = { ALL: ideas.length };
  for (const i of ideas) counts[i.category] = (counts[i.category] ?? 0) + 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter('ALL')} className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold"
          style={filter === 'ALL' ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
          Tümü ({counts.ALL})
        </button>
        {CATEGORY_OPTIONS.map((c) => (
          <button key={c.value} onClick={() => setFilter(c.value)} className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold"
            style={filter === c.value ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            {c.label} ({counts[c.value] ?? 0})
          </button>
        ))}
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Fikir Ekle</Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-10 text-center" style={card}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {ideas.length === 0 ? 'Havuz boş. İlk fikri sen ekle.' : 'Bu kategoride fikir yok.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} isAdmin={isAdmin} commentsEnabled={commentsEnabled} onTransfer={setTransferIdea} />
          ))}
        </div>
      )}

      {adding && <AddIdeaModal onClose={() => setAdding(false)} />}
      {transferIdea && <TransferModal idea={transferIdea} onClose={() => setTransferIdea(null)} />}
    </div>
  );
}
