'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, ThumbsUp, ThumbsDown, HelpCircle, Sparkles, Trash2, ArrowRight, Users, X, Check, Pencil,
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
import { LABEL_META } from '../icerik-performansi/perf.constants';
import { createIdea, updateIdea, voteIdea, deleteIdea, rejectIdea, approveIdea, evaluateIdea } from './actions';

const VOTE_BUTTONS: { type: VoteType; icon: typeof ThumbsUp }[] = [
  { type: 'UP', icon: ThumbsUp },
  { type: 'DOWN', icon: ThumbsDown },
  { type: 'UNSURE', icon: HelpCircle },
];

const card = { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' };

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return String(n);
}

function countFor(idea: IdeaDTO, type: VoteType): number {
  return type === 'UP' ? idea.counts.up : type === 'DOWN' ? idea.counts.down : idea.counts.unsure;
}

// ── Sheet shell: bottom sheet on phones, centered dialog on desktop ──────────

function Sheet({ onClose, children, maxWidth = 'max-w-lg' }: { onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#0B1437]/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-t-2xl p-5 sm:rounded-[var(--radius-lg)] sm:p-6`}
        style={card}
      >
        {children}
      </div>
    </div>
  );
}

// ── Idea form (add + edit) ───────────────────────────────────────────────────

function IdeaFormModal({ idea, onClose }: { idea?: IdeaDTO | null; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const editing = Boolean(idea);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = idea ? await updateIdea(idea.id, fd) : await createIdea(fd);
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  const labelCls = 'mb-1 block text-xs font-medium';
  const labelStyle = { color: 'var(--color-text-muted)' };

  return (
    <Sheet onClose={() => !isPending && onClose()}>
      <h3 className="mb-4 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{editing ? 'Fikri Düzenle' : 'Yeni Fikir'}</h3>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={labelCls} style={labelStyle}>Başlık <span style={{ color: 'var(--color-error)' }}>*</span></label>
          <Input name="title" defaultValue={idea?.title ?? ''} placeholder="örn. MAJ3R belgeseli 2. bölüm" required />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Özet / Metin</label>
          <textarea name="summary" rows={8} defaultValue={idea?.summary ?? ''} placeholder="Fikri özetle ya da tam metni yaz..."
            className="max-h-[40vh] w-full resize-y rounded-[var(--radius-sm)] px-3 py-2.5 text-sm leading-relaxed outline-none"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: 140 }} />
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Tek cümle de olur, detaylı senaryo da — sınır yok.</p>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Kategori</label>
          <Select name="category" defaultValue={idea?.category ?? 'CONTENT'}>
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>

        <div className="rounded-[var(--radius-sm)] p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <p className="mb-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Önerilen Format / Platform <span style={{ color: 'var(--color-text-muted)' }}>(opsiyonel)</span></p>
          <div className="mb-2 flex flex-wrap gap-2">
            {SUGGEST_PLATFORM_OPTIONS.map((p) => (
              <label key={p.value} className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-xs"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                <input type="checkbox" name="suggested_platforms" value={p.value} defaultChecked={idea?.suggested_platforms.includes(p.value) ?? false} className="accent-[var(--color-accent)]" /> {p.label}
              </label>
            ))}
          </div>
          <Select name="suggested_format" defaultValue={idea?.suggested_format ?? ''}>
            <option value="">Format önerme</option>
            {SUGGEST_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </div>

        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {editing
            ? 'Başlığı ya da metni değiştirirsen mevcut AI değerlendirmesi silinir, yeniden çalıştırılabilir.'
            : 'Fikri kimin yazdığını yalnızca admin görür.'}
        </p>
        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>İptal</Button>
          <Button type="submit" disabled={isPending}>{isPending ? 'Kaydediliyor…' : editing ? 'Kaydet' : 'Havuza Ekle'}</Button>
        </div>
      </form>
    </Sheet>
  );
}

// ── Transfer (approve) modal ─────────────────────────────────────────────────

const SUGGEST_TO_FORMAT: Record<string, string> = {
  'Uzun Video': 'Video', 'Short': 'Short / Reels', 'Reels': 'Short / Reels',
  'Gönderi': 'Gönderi / Post', 'Canlı': 'Canlı Yayın',
};

function TransferModal({ idea, onClose }: { idea: IdeaDTO; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const platforms = Object.keys(PLATFORM_LABELS) as ContentPlatform[];

  const suggested = idea.suggested_platforms as string[];
  const overlap = platforms.filter((p) => suggested.includes(p));
  const isChecked = (p: ContentPlatform) => (overlap.length > 0 ? overlap.includes(p) : p === 'YOUTUBE');
  const defaultFormat = (idea.suggested_format && SUGGEST_TO_FORMAT[idea.suggested_format]) || 'Video';

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
    <Sheet onClose={() => !isPending && onClose()} maxWidth="max-w-md">
      <h3 className="mb-1 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>İçerik Planı&apos;na Aktar</h3>
      <p className="mb-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>Kart &quot;Metin Yazılıyor&quot; aşamasında açılır.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Platform(lar) <span style={{ color: 'var(--color-error)' }}>*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2.5 text-sm"
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
    </Sheet>
  );
}

// ── Vote selector — big, obvious, one tap ────────────────────────────────────

function VoteSelector({ idea, disabled, onVote }: { idea: IdeaDTO; disabled: boolean; onVote: (v: VoteType) => void }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Oyunu ver
      </p>
      <div className="grid grid-cols-3 gap-2">
        {VOTE_BUTTONS.map(({ type, icon: Icon }) => {
          const active = idea.my_vote === type;
          const m = VOTE_META[type];
          return (
            <button
              key={type}
              onClick={() => onVote(type)}
              disabled={disabled}
              aria-pressed={active}
              className="relative flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-3 text-xs font-semibold transition-all disabled:opacity-50"
              style={active
                ? { backgroundColor: m.color, color: '#fff', border: `2px solid ${m.color}` }
                : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '2px solid var(--color-border)' }}
            >
              {active && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: '#fff' }}>
                  <Check className="h-3 w-3" style={{ color: m.color }} />
                </span>
              )}
              <Icon className="h-5 w-5" />
              <span className="text-center leading-tight">{m.label}</span>
              <span className="font-mono text-[11px]" style={{ opacity: 0.85 }}>{countFor(idea, type)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        {idea.my_vote
          ? `Senin oyun: ${VOTE_META[idea.my_vote].label} — değiştirmek için başka bir seçeneğe bas.`
          : 'Henüz oy vermedin. Bir seçeneğe bas.'}
      </p>
    </div>
  );
}

// ── Compact card ─────────────────────────────────────────────────────────────

function IdeaCard({ idea, onOpen }: { idea: IdeaDTO; onOpen: () => void }) {
  const cat = CATEGORY_META[idea.category];
  return (
    <button
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] p-3 text-left transition-shadow hover:shadow-md"
      style={card}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: cat.bg, color: cat.color }}>{cat.label}</span>
        {idea.is_mine && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>senin</span>
        )}
        {idea.status !== 'OPEN' && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: STATUS_META[idea.status].bg, color: STATUS_META[idea.status].color }}>{STATUS_META[idea.status].label}</span>
        )}
        {idea.outcome ? (
          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: LABEL_META[idea.outcome.label].bg, color: LABEL_META[idea.outcome.label].color }}>
            {LABEL_META[idea.outcome.label].text}
          </span>
        ) : idea.ai_score != null ? (
          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>%{idea.ai_score}</span>
        ) : null}
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{idea.title}</h3>

      <div className="mt-auto flex items-center gap-1.5 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
        {VOTE_BUTTONS.map(({ type, icon: Icon }) => {
          const active = idea.my_vote === type;
          const m = VOTE_META[type];
          return (
            <span key={type} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={active
                ? { backgroundColor: m.bg, color: m.color, border: `1px solid ${m.color}` }
                : { color: 'var(--color-text-muted)' }}>
              <Icon className="h-3.5 w-3.5" />
              <span className="font-mono">{countFor(idea, type)}</span>
            </span>
          );
        })}
        <span className="ml-auto text-[11px] font-medium" style={{ color: 'var(--color-accent)' }}>Detay →</span>
      </div>
    </button>
  );
}

// ── Detail sheet: full text + AI + voting + admin decision ───────────────────

function IdeaDetail({ idea, isAdmin, commentsEnabled, onClose, onTransfer, onEdit }: {
  idea: IdeaDTO; isAdmin: boolean; commentsEnabled: boolean; onClose: () => void;
  onTransfer: (idea: IdeaDTO) => void; onEdit: (idea: IdeaDTO) => void;
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

  function handleEvaluate() {
    setError(null);
    start(async () => {
      const r = await evaluateIdea(idea.id);
      if (r.error) setError(r.error);
      else { if (r.comment) setComment(r.comment); if (r.score !== undefined) setScore(r.score ?? null); }
    });
  }

  return (
    <Sheet onClose={onClose}>
      {/* head */}
      <div className="mb-3 flex items-start gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: cat.bg, color: cat.color }}>{cat.label}</span>
          {idea.status !== 'OPEN' && (
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: STATUS_META[idea.status].bg, color: STATUS_META[idea.status].color }}>{STATUS_META[idea.status].label}</span>
          )}
          {isAdmin && idea.author_name && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>✍️ {idea.author_name}</span>
          )}
        </div>
        {(isAdmin || idea.is_mine) && idea.status === 'OPEN' && (
          <button onClick={() => onEdit(idea)} className="rounded p-1.5" style={{ color: 'var(--color-text-muted)' }} aria-label="Düzenle" title="Düzenle">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button onClick={onClose} className="rounded p-1" style={{ color: 'var(--color-text-muted)' }} aria-label="Kapat">
          <X className="h-5 w-5" />
        </button>
      </div>

      <h2 className="text-lg font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{idea.title}</h2>

      {idea.summary && (
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{idea.summary}</p>
      )}

      {/* Real outcome — the idea → card → video → performance chain */}
      {idea.outcome && (
        <a
          href={`https://youtu.be/${idea.outcome.video_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] p-3 transition-opacity hover:opacity-90"
          style={{ backgroundColor: LABEL_META[idea.outcome.label].bg, border: `1px solid ${LABEL_META[idea.outcome.label].color}` }}
        >
          <span className="text-[11px] font-bold" style={{ color: LABEL_META[idea.outcome.label].color }}>
            {LABEL_META[idea.outcome.label].text}
          </span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {fmtViews(idea.outcome.views)} izlenme
          </span>
          {idea.outcome.score != null && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              tür ortalamasının {idea.outcome.score.toFixed(2)}x&apos;i
            </span>
          )}
          <span className="ml-auto text-[11px] font-medium" style={{ color: LABEL_META[idea.outcome.label].color }}>videoyu aç →</span>
        </a>
      )}

      {(idea.suggested_platforms.length > 0 || idea.suggested_format) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Öneri</span>
          {idea.suggested_platforms.map((p) => (
            <span key={p} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>{SUGGEST_PLATFORM_LABELS[p]}</span>
          ))}
          {idea.suggested_format && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>{idea.suggested_format}</span>
          )}
        </div>
      )}

      {/* voting */}
      <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <VoteSelector idea={idea} disabled={isPending} onVote={(v) => run(() => voteIdea(idea.id, v))} />
      </div>

      {isAdmin && idea.voters && (
        <div className="mt-3">
          <button onClick={() => setShowVoters((v) => !v)} className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <Users className="h-3 w-3" /> {showVoters ? 'gizle' : 'kim ne verdi'}
          </button>
          {showVoters && (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-[var(--radius-sm)] p-2" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              {idea.voters.length === 0
                ? <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Henüz oy yok</span>
                : idea.voters.map((v, i) => (
                    <span key={i} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: VOTE_META[v.vote].bg, color: VOTE_META[v.vote].color }}>{v.name}: {VOTE_META[v.vote].label}</span>
                  ))}
            </div>
          )}
        </div>
      )}

      {/* AI */}
      <div className="mt-4">
        {comment ? (
          <div className="rounded-[var(--radius-sm)] p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}><Sparkles className="h-3 w-3" /> AI değerlendirme</span>
              {score != null && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>Tahmini tutma %{score}</span>}
            </div>
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{comment}</p>
          </div>
        ) : isAdmin ? (
          <button onClick={handleEvaluate} disabled={!commentsEnabled || isPending}
            title={commentsEnabled ? 'Claude ile değerlendir' : 'ANTHROPIC_API_KEY gerekli'}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-2.5 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            <Sparkles className="h-3.5 w-3.5" /> {isPending ? 'Değerlendiriliyor…' : 'Değerlendir'}
          </button>
        ) : null}
      </div>

      {error && <p className="mt-2 text-[11px]" style={{ color: 'var(--color-error)' }}>{error}</p>}

      {/* admin decision */}
      {isAdmin && idea.status === 'OPEN' && (
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <Button onClick={() => onTransfer(idea)} disabled={isPending} className="flex-1">
            <ArrowRight className="mr-1.5 h-4 w-4" /> Onayla → Aktar
          </Button>
          <Button variant="secondary" onClick={() => run(() => rejectIdea(idea.id))} disabled={isPending}>
            <X className="mr-1 h-4 w-4" /> Reddet
          </Button>
        </div>
      )}
      {idea.status === 'APPROVED' && (
        <p className="mt-3 text-[11px]" style={{ color: 'var(--color-success)' }}>İçerik Planı&apos;na aktarıldı — &quot;Metin Yazılıyor&quot; aşamasında.</p>
      )}

      {/* Admins delete anything; authors may delete their own idea. */}
      {(isAdmin || idea.is_mine) && (
        <div className="mt-4 flex justify-end border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={() => { if (confirm('Fikri sil?')) { run(() => deleteIdea(idea.id)); onClose(); } }} disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold" style={{ color: 'var(--color-error)' }}>
            <Trash2 className="h-3.5 w-3.5" /> {isAdmin ? 'Fikri sil' : 'Fikrimi sil'}
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export function IdeaBoard({ ideas, isAdmin, commentsEnabled }: { ideas: IdeaDTO[]; isAdmin: boolean; commentsEnabled: boolean }) {
  const [filter, setFilter] = useState<'ALL' | IdeaCategory>('ALL');
  const [adding, setAdding] = useState(false);
  const [editIdea, setEditIdea] = useState<IdeaDTO | null>(null);
  const [transferIdea, setTransferIdea] = useState<IdeaDTO | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const visible = ideas.filter((i) => filter === 'ALL' || i.category === filter);
  const counts: Record<string, number> = { ALL: ideas.length };
  for (const i of ideas) counts[i.category] = (counts[i.category] ?? 0) + 1;

  // Re-derive from props so the sheet reflects fresh data after a vote.
  const detail = detailId ? ideas.find((i) => i.id === detailId) ?? null : null;

  const chip = (active: boolean) =>
    active
      ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
      : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter('ALL')} className="rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold" style={chip(filter === 'ALL')}>
          Tümü ({counts.ALL})
        </button>
        {CATEGORY_OPTIONS.map((c) => (
          <button key={c.value} onClick={() => setFilter(c.value)} className="rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold" style={chip(filter === c.value)}>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onOpen={() => setDetailId(idea.id)} />
          ))}
        </div>
      )}

      {adding && <IdeaFormModal onClose={() => setAdding(false)} />}
      {editIdea && <IdeaFormModal idea={editIdea} onClose={() => setEditIdea(null)} />}
      {detail && (
        <IdeaDetail
          idea={detail}
          isAdmin={isAdmin}
          commentsEnabled={commentsEnabled}
          onClose={() => setDetailId(null)}
          onTransfer={setTransferIdea}
          onEdit={setEditIdea}
        />
      )}
      {transferIdea && <TransferModal idea={transferIdea} onClose={() => setTransferIdea(null)} />}
    </div>
  );
}
