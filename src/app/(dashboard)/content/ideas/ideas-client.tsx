'use client';

import { useState, useTransition } from 'react';
import {
  Plus, Loader2, CheckCircle2, XCircle, Clock, Send,
  Instagram, Youtube, Twitter, Tv2, Trash2,
} from 'lucide-react';
import {
  createPostAction, updatePostStatusAction, deletePostAction,
} from './actions';
import { CaptionCell } from '@/app/(dashboard)/sosyal-medya/caption-modal';
import { getContentTypes, getContentTypeLabel } from '@/app/(dashboard)/sosyal-medya/platform-content-types';
import type { SpecialPost, User, PostStatus } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ['Instagram', 'YouTube', 'X', 'Twitch', 'TikTok'];


const STATUS_META: Record<PostStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ONAY_BEKLIYOR: { label: 'Onay Bekliyor', color: 'var(--color-warning)',  icon: <Clock size={12} /> },
  ONAYLANDI:     { label: 'Onaylandı',     color: 'var(--color-info)',     icon: <CheckCircle2 size={12} /> },
  YAYINLANDI:    { label: 'Yayınlandı',    color: 'var(--color-success)',  icon: <Send size={12} /> },
  REDDEDILDI:    { label: 'Reddedildi',    color: 'var(--color-error)',    icon: <XCircle size={12} /> },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <Instagram size={12} />,
  YouTube:   <Youtube size={12} />,
  X:         <Twitter size={12} />,
  Twitch:    <Tv2 size={12} />,
};

// ── Input styles ──────────────────────────────────────────────────────────────

const inputCls = [
  'w-full rounded-[var(--radius-md)] border px-3 py-3 text-base sm:text-sm',
  'bg-[var(--color-bg-primary)] border-[var(--color-border)]',
  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
  'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
  'min-h-[44px]', // WCAG touch target
].join(' ');

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ── Add Post Modal ────────────────────────────────────────────────────────────

function AddPostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, start]   = useTransition();
  const [error, setError]  = useState<string | null>(null);
  const [done, setDone]    = useState(false);
  const [platform, setPlatform] = useState<string>('');
  const contentTypes = getContentTypes(platform ? [platform] : []);

  if (!open) return null;

  function reset() { setDone(false); setPlatform(''); setError(null); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!platform) { setError('Bir platform seçmelisin.'); return; }
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.append('platforms', platform);

    start(async () => {
      try {
        await createPostAction(fd);
        setDone(true);
        setTimeout(() => { reset(); onClose(); }, 700);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/*
        Mobile: bottom sheet (slides up from bottom, full width, rounded top corners)
        Desktop: centered modal
      */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-[var(--radius-lg)] overflow-hidden flex flex-col"
          style={{
            background: 'var(--color-bg-secondary)',
            maxHeight: '92dvh',
          }}
        >
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-[var(--color-border-hover)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-3 sm:pt-5"
            style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Yeni İçerik Fikri
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Her platform için ayrı kayıt
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          </div>

          {/* Scrollable form */}
          <form
            onSubmit={submit}
            className="overflow-y-auto px-5 py-4 space-y-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Field label="Başlık" required>
              <input name="title" required placeholder="ör. Turnuva finali highlight" className={inputCls} />
            </Field>

            {/* Platform — tek seçim */}
            <Field label="Platform" required>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const selected = platform === p;
                  return (
                    <button key={p} type="button"
                      onClick={() => setPlatform(p)}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-md)] text-xs font-semibold border transition-colors min-h-[44px]"
                      style={{
                        background:  selected ? 'var(--color-accent)' : 'transparent',
                        color:       selected ? '#fff' : 'var(--color-text-secondary)',
                        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                      }}>
                      {PLATFORM_ICONS[p]} {p}
                    </button>
                  );
                })}
              </div>
              {platform && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Seçili: <span className="font-semibold">{platform}</span>
                </p>
              )}
            </Field>

            <Field label="İçerik Türü" required>
              <select name="content_type" required className={inputCls} disabled={!platform}>
                {!platform
                  ? <option value="">— Önce platform seç —</option>
                  : contentTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))
                }
              </select>
            </Field>

            <Field label="Açıklama / Caption">
              <textarea name="caption" rows={3}
                placeholder="İçerik hakkında notlar, caption taslağı, bağlantılar..."
                className={`${inputCls} resize-none`} />
            </Field>

            {error && (
              <p className="text-xs px-3 py-2 rounded-[var(--radius-md)]"
                style={{ color: 'var(--color-error)', background: 'rgba(238,93,80,0.08)', border: '1px solid rgba(238,93,80,0.2)' }}>
                {error}
              </p>
            )}

            {done && (
              <p className="text-xs px-3 py-2 rounded-[var(--radius-md)] text-center font-semibold"
                style={{ color: 'var(--color-success)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                ✓ Fikir eklendi
              </p>
            )}

            <button type="submit" disabled={pending || done}
              className="w-full flex items-center justify-center gap-2 min-h-[52px] rounded-[var(--radius-md)] text-sm font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--color-accent)' }}>
              {pending ? <><Loader2 size={14} className="animate-spin" /> Kaydediliyor…</> : 'Fikri Ekle'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PostStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}>
      {meta.icon} {meta.label}
    </span>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({
  post, isAdmin, onRefresh,
}: {
  post: SpecialPost;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const [pending, start] = useTransition();

  function changeStatus(status: PostStatus) {
    start(async () => { await updatePostStatusAction(post.id, status); onRefresh(); });
  }

  function handleDelete() {
    if (!confirm('Bu fikri silmek istediğine emin misin?')) return;
    start(async () => { await deletePostAction(post.id); onRefresh(); });
  }

  return (
    <div className="rounded-[var(--radius-md)] border p-4 space-y-3 transition-opacity"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', opacity: pending ? 0.6 : 1 }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {post.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {post.author?.full_name} · {new Date(post.created_at).toLocaleDateString('tr-TR')}
          </p>
        </div>
        <StatusBadge status={post.status} />
      </div>

      {/* Platforms + type */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
          {getContentTypeLabel(post.content_type)}
        </span>
        {post.platforms.map(p => (
          <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            {PLATFORM_ICONS[p]} {p}
          </span>
        ))}
      </div>

      {/* Caption — truncated + modal */}
      <CaptionCell title={post.title} caption={post.caption} className="text-xs leading-relaxed block" />

      {/* Admin: durum butonları + sil */}
      {isAdmin && (
        <div className="pt-2 space-y-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_META) as PostStatus[]).map(s => (
              <button key={s} disabled={post.status === s || pending}
                onClick={() => changeStatus(s)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] border transition-colors disabled:opacity-40"
                style={{
                  background: post.status === s ? STATUS_META[s].color : 'transparent',
                  color: post.status === s ? '#fff' : STATUS_META[s].color,
                  borderColor: STATUS_META[s].color,
                }}>
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={handleDelete} disabled={pending}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-[var(--radius-sm)] transition-colors"
              style={{ color: 'var(--color-error)' }}>
              <Trash2 size={11} /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Atanmış ekip bilgisi (non-admin için) */}
      {!isAdmin && (post.editor?.full_name || post.designer?.full_name) && (
        <div className="flex gap-3 pt-2 border-t text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          {post.editor?.full_name   && <span>✏️ {post.editor.full_name}</span>}
          {post.designer?.full_name && <span>🎨 {post.designer.full_name}</span>}
        </div>
      )}
    </div>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────

const TABS: { key: PostStatus | 'TUMU'; label: string }[] = [
  { key: 'TUMU',          label: 'Tümü'          },
  { key: 'ONAY_BEKLIYOR', label: 'Bekleyenler'   },
  { key: 'ONAYLANDI',     label: 'Onaylananlar'  },
  { key: 'YAYINLANDI',    label: 'Yayınlananlar' },
  { key: 'REDDEDILDI',    label: 'Reddedilenler' },
];

// ── Main Client ───────────────────────────────────────────────────────────────

export function IdeasClient({
  posts: initialPosts,
  currentUser,
  allUsers,
}: {
  posts: SpecialPost[];
  currentUser: User;
  allUsers: User[];
}) {
  const [posts]      = useState<SpecialPost[]>(initialPosts);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PostStatus | 'TUMU'>('TUMU');

  const isAdmin = currentUser.role === 'ADMIN';

  const filtered = activeTab === 'TUMU'
    ? posts
    : posts.filter(p => p.status === activeTab);

  const counts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  function refresh() { window.location.reload(); }

  return (
    <div className="space-y-5">

      {/* Kendi istatistik kartları */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(STATUS_META) as PostStatus[]).map(s => (
          <div key={s} className="rounded-[var(--radius-md)] border p-3"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {isAdmin ? STATUS_META[s].label : `Benim — ${STATUS_META[s].label}`}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: STATUS_META[s].color }}>
              {counts[s] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Üst bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-3 min-h-[40px] text-xs font-semibold rounded-[var(--radius-md)] transition-colors"
              style={{
                background: activeTab === t.key ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: activeTab === t.key ? '#fff' : 'var(--color-text-secondary)',
              }}>
              {t.label}
              {t.key !== 'TUMU' && counts[t.key] ? ` (${counts[t.key]})` : ''}
            </button>
          ))}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 min-h-[44px] rounded-[var(--radius-md)] text-sm font-semibold text-white shrink-0"
          style={{ background: 'var(--color-accent)' }}>
          <Plus size={15} /> Fikir Ekle
        </button>
      </div>

      {/* İçerik başlığı */}
      {!isAdmin && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Yalnızca senin gönderdiğin fikirler gösteriliyor.
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-sm">Bu kategoride henüz fikir yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isAdmin={isAdmin}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <AddPostModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
