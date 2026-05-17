'use client';

import { useState, useTransition } from 'react';
import {
  Plus, X, Loader2, Eye, Heart, MessageCircle,
  TrendingUp, FileText, BarChart3,
  Instagram, Youtube, Twitter, Tv2, Send,
} from 'lucide-react';
import { submitContentIdea, claimPost } from '@/app/actions/social-actions';
import { CaptionCell } from './caption-modal';
import { getContentTypes, getContentTypeLabel } from './platform-content-types';
import type { SpecialPost, User, PostStatus } from '@/types';
import type { CreatorDashboardData } from '@/app/actions/social-actions';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'Instagram', label: 'Instagram', icon: <Instagram size={14} /> },
  { id: 'YouTube',   label: 'YouTube',   icon: <Youtube size={14} />   },
  { id: 'X',         label: 'X',         icon: <Twitter size={14} />   },
  { id: 'Twitch',    label: 'Twitch',    icon: <Tv2 size={14} />       },
  { id: 'TikTok',    label: 'TikTok',    icon: <Send size={14} />      },
];

const STATUS_LABELS: Record<PostStatus, string> = {
  ONAY_BEKLIYOR: 'Bekliyor',
  ONAYLANDI:     'Onaylandı',
  YAYINLANDI:    'Yayınlandı',
  REDDEDILDI:    'Reddedildi',
};

const STATUS_COLORS: Record<PostStatus, string> = {
  ONAY_BEKLIYOR: 'var(--color-warning)',
  ONAYLANDI:     'var(--color-info)',
  YAYINLANDI:    'var(--color-success)',
  REDDEDILDI:    'var(--color-error)',
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  Instagram: <Instagram size={13} />,
  YouTube:   <Youtube size={13} />,
  X:         <Twitter size={13} />,
  Twitch:    <Tv2 size={13} />,
  TikTok:    <Send size={13} />,
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border p-4 flex flex-col gap-2"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── New Idea Modal ────────────────────────────────────────────────────────────

function NewIdeaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [error, setError]   = useState<string | null>(null);
  const [done,  setDone]    = useState(false);

  const contentTypes = getContentTypes(platforms);

  if (!open) return null;

  function toggle(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (platforms.length === 0) { setError('En az bir platform seç.'); return; }
    const fd = new FormData(e.currentTarget);

    start(async () => {
      try {
        const result = await submitContentIdea(
          fd.get('title') as string,
          platforms,
          fd.get('content_type') as string,
          (fd.get('caption') as string) || undefined,
        );
        if (!result.success) { setError(result.error ?? 'Hata oluştu.'); return; }
        setDone(true);
        setTimeout(() => { setDone(false); setPlatforms([]); onClose(); }, 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sunucu hatası.');
      }
    });
  }

  const inputCls = [
    'w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-sm',
    'bg-[var(--color-bg-primary)] border-[var(--color-border)]',
    'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
    'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
  ].join(' ');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto rounded-[var(--radius-lg)] overflow-hidden shadow-2xl"
          style={{ background: 'var(--color-bg-secondary)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Yeni İçerik Fikri Öner
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Fikrin yöneticiye iletilecek ve onay bekleyecek
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-[var(--radius-md)] transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="px-6 py-5 space-y-4">

            {/* Başlık */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}>
                Başlık <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input name="title" required placeholder="ör. Turnuva özet klibi — FNL Finali"
                className={inputCls} />
            </div>

            {/* Platformlar */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}>
                Platformlar <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} type="button" onClick={() => toggle(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border text-xs font-semibold transition-all"
                    style={{
                      background:   platforms.includes(p.id) ? 'var(--color-accent)' : 'transparent',
                      color:        platforms.includes(p.id) ? '#fff' : 'var(--color-text-secondary)',
                      borderColor:  platforms.includes(p.id) ? 'var(--color-accent)' : 'var(--color-border)',
                    }}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* İçerik Türü */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}>
                İçerik Türü <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select name="content_type" required className={inputCls}
                disabled={contentTypes.length === 0}>
                {contentTypes.length === 0
                  ? <option value="">— Önce platform seç —</option>
                  : contentTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))
                }
              </select>
              {platforms.length > 1 && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {platforms.join(' + ')} için uygun formatlar listeleniyor
                </p>
              )}
            </div>

            {/* Caption / Açıklama */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}>
                Açıklama / Caption Taslağı
              </label>
              <textarea name="caption" rows={3}
                placeholder="İçerik hakkında notlar, bağlantılar, referanslar..."
                className={`${inputCls} resize-none`} />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-[var(--radius-md)]"
                style={{ color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            {done && (
              <p className="text-xs px-3 py-2 rounded-[var(--radius-md)] text-center font-semibold"
                style={{ color: 'var(--color-success)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                ✓ Fikir iletildi, onay bekleniyor
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold border transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                İptal
              </button>
              <button type="submit" disabled={pending || done}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] text-sm font-bold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'var(--color-accent)' }}>
                {pending ? <><Loader2 size={14} className="animate-spin" /> Gönderiliyor…</> : 'Fikri Gönder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Posts Table ───────────────────────────────────────────────────────────────

function PostsTable({ posts }: { posts: SpecialPost[] }) {
  const visible = posts.filter(p => p.status === 'ONAYLANDI' || p.status === 'YAYINLANDI');

  if (visible.length === 0) {
    return (
      <div className="py-12 text-center rounded-[var(--radius-md)] border"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
        <p className="text-sm">Henüz onaylanmış veya yayınlanmış içeriğin yok.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border overflow-hidden"
      style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
            {['İçerik', 'Platformlar', 'Tür', 'İzlenme', 'Beğeni', 'Etkileşim', 'Durum'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((post, i) => (
            <tr key={post.id}
              style={{
                background: i % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                borderBottom: '1px solid var(--color-border)',
              }}>
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-[200px]"
                  style={{ color: 'var(--color-text-primary)' }}>{post.title}</p>
                <CaptionCell title={post.title} caption={post.caption} className="text-xs mt-0.5 block" />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  {post.platforms.map(p => (
                    <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]"
                      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                      {PLATFORM_ICON[p]} {p}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {getContentTypeLabel(post.content_type)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--color-text-primary)' }}>
                  <Eye size={12} style={{ color: 'var(--color-text-muted)' }} />
                  {fmt(post.views)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--color-text-primary)' }}>
                  <Heart size={12} style={{ color: 'var(--color-error)' }} />
                  {fmt(post.likes)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-bold"
                  style={{ color: post.engagement_rate >= 5 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                  %{post.engagement_rate.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{
                    color: STATUS_COLORS[post.status],
                    background: `color-mix(in srgb, ${STATUS_COLORS[post.status]} 12%, transparent)`,
                  }}>
                  {STATUS_LABELS[post.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── İş Havuzu (Editör & Grafiker) ────────────────────────────────────────────

function JobCard({ post }: { post: SpecialPost }) {
  const [pending, start] = useTransition();
  const [claimed, setClaimed] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  function claim() {
    start(async () => {
      const result = await claimPost(post.id);
      if (!result.success) { setError(result.error ?? 'Hata oluştu.'); return; }
      setClaimed(true);
    });
  }

  if (claimed) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]"
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <span style={{ color: 'var(--color-success)' }}>✓</span>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          <span className="font-bold">{post.title}</span> — Üzerinize alındı
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', opacity: pending ? 0.6 : 1 }}>
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {post.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{post.content_type}</span>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{post.platforms.join(', ')}</span>
            {post.author?.full_name && (
              <>
                <span style={{ color: 'var(--color-border)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{post.author.full_name}</span>
              </>
            )}
          </div>
          <CaptionCell title={post.title} caption={post.caption} className="text-xs mt-1 block" />
          {error && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{error}</p>}
        </div>
        <button onClick={claim} disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] text-white flex-shrink-0 disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}>
          {pending && <Loader2 size={12} className="animate-spin" />}
          İşi Üzerime Al
        </button>
      </div>
    </div>
  );
}

function JobPool({ posts, userRole }: { posts: SpecialPost[]; userRole: string }) {
  const available = posts.filter(p =>
    p.status === 'ONAYLANDI' &&
    (userRole === 'EDITOR'   ? !p.editor_id   : true) &&
    (userRole === 'GRAFIKER' ? !p.designer_id : true)
  );

  if (available.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Havuzdaki Boş İşler
        </h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-info)' }}>
          {available.length} iş mevcut
        </span>
      </div>
      <div className="space-y-2">
        {available.map(post => <JobCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}

// ── Main Creator View ─────────────────────────────────────────────────────────

export function CreatorView({
  currentUser,
  dashboardData,
  allPosts,
  poolPosts,
}: {
  currentUser: User;
  dashboardData: CreatorDashboardData;
  allPosts: SpecialPost[];
  poolPosts: SpecialPost[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const canClaimJobs = currentUser.role === 'EDITOR' || currentUser.role === 'GRAFIKER';

  return (
    <div className="space-y-6">
      {/* Üst bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Hoş geldin,{' '}
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {currentUser.full_name}
          </span>
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}>
          <Plus size={15} /> Yeni Fikir Öner
        </button>
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText size={16} />}
          label="Toplam İçeriğim"
          value={allPosts.length}
          sub={`${dashboardData.publishedPosts.length} yayınlandı`}
        />
        <StatCard
          icon={<BarChart3 size={16} />}
          label="Ort. Etkileşim Oranım"
          value={`%${dashboardData.avgEngagementRate.toFixed(1)}`}
          sub="Yayınlanan içerikler üzerinden"
        />
        <StatCard
          icon={<Eye size={16} />}
          label="Toplam Görüntülenmem"
          value={fmt(dashboardData.totalViews)}
          sub="Tüm yayınlanmış içerikler"
        />
      </div>

      {/* İş havuzu — Editör & Grafiker görür */}
      {canClaimJobs && <JobPool posts={poolPosts} userRole={currentUser.role} />}

      {/* Onaylanan & Yayınlanan tablo */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Onaylanan & Yayınlanan İçeriklerim
        </h2>
        <PostsTable posts={allPosts} />
      </div>

      {/* Onay bekleyenler */}
      {allPosts.filter(p => p.status === 'ONAY_BEKLIYOR').length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Onay Bekleyen Fikirlerim
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)' }}>
              {allPosts.filter(p => p.status === 'ONAY_BEKLIYOR').length}
            </span>
          </h2>
          <div className="space-y-2">
            {allPosts.filter(p => p.status === 'ONAY_BEKLIYOR').map(post => (
              <div key={post.id}
                className="flex items-center gap-4 px-4 py-3 rounded-[var(--radius-md)] border"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <TrendingUp size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {post.title}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {post.platforms.map(p => (
                      <span key={p} className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{p}</span>
                    ))}
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(post.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewIdeaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
