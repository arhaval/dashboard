'use client';

import { useState, useTransition } from 'react';
import {
  Plus, Loader2, CheckCircle2, XCircle, Clock, Send,
  Instagram, Youtube, Twitter, Tv2, Pencil, Trash2,
} from 'lucide-react';
import {
  createPostAction, updatePostStatusAction, deletePostAction,
  assignEditorAction, assignDesignerAction,
} from './actions';
import type { SpecialPost, User, PostStatus } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ['Instagram', 'YouTube', 'X', 'Twitch', 'TikTok'];

const CONTENT_TYPES = [
  'Kısa Video / Reels',
  'Uzun Video',
  'Fotoğraf / Post',
  'Story',
  'Canlı Yayın Klibi',
  'İnfografik',
  'Thread / Yazı',
  'Diğer',
];

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
  'w-full rounded-[var(--radius-md)] border px-3 py-2 text-sm',
  'bg-[var(--color-bg-primary)] border-[var(--color-border)]',
  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
  'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
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
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  if (!open) return null;

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedPlatforms.length === 0) { setError('En az bir platform seçmelisin.'); return; }
    setError(null);

    const fd = new FormData(e.currentTarget);
    selectedPlatforms.forEach(p => fd.append('platforms', p));

    start(async () => {
      try {
        await createPostAction(fd);
        setDone(true);
        setTimeout(onClose, 700);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)' }}>

          <div className="flex items-center justify-between px-5 pt-5 pb-3"
            style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Yeni İçerik Fikri
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-[var(--radius-md)]"
              style={{ color: 'var(--color-text-muted)' }}>✕</button>
          </div>

          <form onSubmit={submit} className="px-5 py-4 space-y-4">
            <Field label="Başlık" required>
              <input name="title" required placeholder="ör. Turnuva finali highlight" className={inputCls} />
            </Field>

            <Field label="Platform(lar)" required>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p} type="button"
                    onClick={() => togglePlatform(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold border transition-colors"
                    style={{
                      background: selectedPlatforms.includes(p) ? 'var(--color-accent)' : 'transparent',
                      color: selectedPlatforms.includes(p) ? '#fff' : 'var(--color-text-secondary)',
                      borderColor: selectedPlatforms.includes(p) ? 'var(--color-accent)' : 'var(--color-border)',
                    }}>
                    {PLATFORM_ICONS[p]} {p}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="İçerik Türü" required>
              <select name="content_type" required className={inputCls}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] text-sm font-bold text-white transition-opacity disabled:opacity-60"
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
  post, isAdmin, allUsers, onRefresh,
}: {
  post: SpecialPost;
  isAdmin: boolean;
  allUsers: User[];
  onRefresh: () => void;
}) {
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const editors   = allUsers.filter(u => u.role === 'EDITOR');
  const designers = allUsers.filter(u => u.role === 'GRAFIKER');

  function changeStatus(status: PostStatus) {
    start(async () => { await updatePostStatusAction(post.id, status); onRefresh(); });
  }

  function changeEditor(editorId: string) {
    start(async () => { await assignEditorAction(post.id, editorId || null); onRefresh(); });
  }

  function changeDesigner(designerId: string) {
    start(async () => { await assignDesignerAction(post.id, designerId || null); onRefresh(); });
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
          {post.content_type}
        </span>
        {post.platforms.map(p => (
          <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            {PLATFORM_ICONS[p]} {p}
          </span>
        ))}
      </div>

      {/* Caption preview */}
      {post.caption && (
        <div>
          <p className="text-xs leading-relaxed line-clamp-2"
            style={{ color: 'var(--color-text-secondary)' }}>
            {post.caption}
          </p>
          {post.caption.length > 100 && (
            <button onClick={() => setExpanded(x => !x)}
              className="text-[11px] mt-0.5 underline"
              style={{ color: 'var(--color-text-muted)' }}>
              {expanded ? 'Gizle' : 'Devamını gör'}
            </button>
          )}
          {expanded && (
            <p className="text-xs leading-relaxed mt-1"
              style={{ color: 'var(--color-text-secondary)' }}>
              {post.caption}
            </p>
          )}
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="pt-2 space-y-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {/* Durum */}
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

          {/* Editör & Grafiker ataması */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: 'var(--color-text-muted)' }}>Editör</p>
              <select
                value={post.editor_id ?? ''}
                onChange={e => changeEditor(e.target.value)}
                className="w-full text-xs rounded-[var(--radius-sm)] border px-2 py-1.5"
                style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                <option value="">— Atanmadı —</option>
                {editors.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: 'var(--color-text-muted)' }}>Grafiker</p>
              <select
                value={post.designer_id ?? ''}
                onChange={e => changeDesigner(e.target.value)}
                className="w-full text-xs rounded-[var(--radius-sm)] border px-2 py-1.5"
                style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                <option value="">— Atanmadı —</option>
                {designers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Sil */}
          <div className="flex justify-end">
            <button onClick={handleDelete} disabled={pending}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-[var(--radius-sm)] transition-colors"
              style={{ color: 'var(--color-error)' }}>
              <Trash2 size={11} /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Atama bilgisi (non-admin) */}
      {!isAdmin && (post.editor?.full_name || post.designer?.full_name) && (
        <div className="flex gap-3 pt-2 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          {post.editor?.full_name   && <span><Pencil size={10} className="inline mr-1" />{post.editor.full_name}</span>}
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

  // Refresh — page re-render (server action revalidatePath handles data)
  function refresh() { window.location.reload(); }

  return (
    <div className="space-y-5">
      {/* Stat kartları */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(STATUS_META) as PostStatus[]).map(s => (
          <div key={s} className="rounded-[var(--radius-md)] border p-3"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {STATUS_META[s].label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: STATUS_META[s].color }}>
              {counts[s] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Üst bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] transition-colors"
              style={{
                background: activeTab === t.key ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: activeTab === t.key ? '#fff' : 'var(--color-text-secondary)',
              }}>
              {t.label}
              {t.key !== 'TUMU' && counts[t.key] ? ` (${counts[t.key]})` : ''}
            </button>
          ))}
        </div>

        {/* Ekle butonu */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold text-white"
          style={{ background: 'var(--color-accent)' }}>
          <Plus size={15} /> Fikir Ekle
        </button>
      </div>

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
              allUsers={allUsers}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <AddPostModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
