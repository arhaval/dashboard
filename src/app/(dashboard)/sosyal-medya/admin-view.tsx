'use client';

import { useState, useTransition } from 'react';
import {
  CheckCircle2, XCircle,
  Trophy, Users, Layers, Loader2, Pencil, X,
} from 'lucide-react';
import { reviewContentIdea, updatePostMetrics } from '@/app/actions/social-actions';
import type { SpecialPost, User, PostStatus } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

const STATUS_COLORS: Record<PostStatus, string> = {
  ONAY_BEKLIYOR: 'var(--color-warning)',
  ONAYLANDI:     'var(--color-info)',
  YAYINLANDI:    'var(--color-success)',
  REDDEDILDI:    'var(--color-error)',
};

const STATUS_LABELS: Record<PostStatus, string> = {
  ONAY_BEKLIYOR: 'Bekliyor',
  ONAYLANDI:     'Onaylandı',
  YAYINLANDI:    'Yayınlandı',
  REDDEDILDI:    'Reddedildi',
};

// ── Insight hesaplamaları ─────────────────────────────────────────────────────

function computeInsights(posts: SpecialPost[], users: User[]) {
  const published = posts.filter(p => p.status === 'YAYINLANDI');

  // En çok tutan platform
  const platformCount: Record<string, number> = {};
  published.forEach(p => p.platforms.forEach(pl => {
    platformCount[pl] = (platformCount[pl] || 0) + 1;
  }));
  const topPlatform = Object.entries(platformCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  // En yüksek etkileşim oranına sahip içerik türü
  const typeEngagement: Record<string, number[]> = {};
  published.forEach(p => {
    if (!typeEngagement[p.content_type]) typeEngagement[p.content_type] = [];
    typeEngagement[p.content_type].push(p.engagement_rate);
  });
  const topContentType = Object.entries(typeEngagement)
    .map(([type, rates]) => ({ type, avg: rates.reduce((a, b) => a + b, 0) / rates.length }))
    .sort((a, b) => b.avg - a.avg)[0];

  // En başarılı içerik üretici (toplam izlenme)
  const creatorViews: Record<string, number> = {};
  published.forEach(p => {
    creatorViews[p.author_id] = (creatorViews[p.author_id] || 0) + p.views;
  });
  const topCreatorId = Object.entries(creatorViews).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCreator = users.find(u => u.id === topCreatorId);

  return { topPlatform, topContentType, topCreator, topCreatorViews: topCreatorId ? creatorViews[topCreatorId] : 0 };
}

// ── Insight Card ──────────────────────────────────────────────────────────────

function InsightCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
      <p className="text-xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Approve Row ───────────────────────────────────────────────────────────────

function ApprovalRow({ post }: { post: SpecialPost }) {
  const [pending, start] = useTransition();
  const [done, setDone]  = useState<'approved' | 'rejected' | null>(null);

  function approve() {
    start(async () => {
      await reviewContentIdea(post.id, 'ONAYLANDI');
      setDone('approved');
    });
  }

  function reject() {
    start(async () => {
      await reviewContentIdea(post.id, 'REDDEDILDI');
      setDone('rejected');
    });
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]"
        style={{
          background: done === 'approved' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${done === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
        {done === 'approved'
          ? <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
          : <XCircle     size={14} style={{ color: 'var(--color-error)'   }} />
        }
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          <span className="font-bold">{post.title}</span>
          {done === 'approved' ? ' — İş havuzuna eklendi' : ' — Reddedildi'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-secondary)',
        opacity: pending ? 0.6 : 1,
      }}>
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {post.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{post.author?.full_name}</span>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{post.content_type}</span>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{post.platforms.join(', ')}</span>
          </div>
          {post.caption && (
            <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
              {post.caption}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={reject} disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] transition-colors disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <XCircle size={13} /> Reddet
          </button>
          <button onClick={approve} disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-success)' }}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Onayla → Havuza Al
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Metrics Update Modal ──────────────────────────────────────────────────────

function MetricsModal({ post, onClose }: { post: SpecialPost; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [done,  setDone]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = [
    'w-full rounded-[var(--radius-md)] border px-3 py-2 text-sm',
    'bg-[var(--color-bg-primary)] border-[var(--color-border)]',
    'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
    'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
  ].join(' ');

  const FIELDS: { name: string; label: string; icon: string; defaultVal: number }[] = [
    { name: 'views',    label: 'Görüntülenme', icon: '👁️',  defaultVal: post.views    },
    { name: 'likes',    label: 'Beğeni',        icon: '❤️',  defaultVal: post.likes    },
    { name: 'comments', label: 'Yorum',          icon: '💬', defaultVal: post.comments },
    { name: 'shares',   label: 'Paylaşım',       icon: '↗️', defaultVal: post.shares   },
    { name: 'saves',    label: 'Yer İşareti',    icon: '🔖', defaultVal: post.saves    },
  ];

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    start(async () => {
      try {
        const result = await updatePostMetrics(post.id, {
          views:    Number(fd.get('views')),
          likes:    Number(fd.get('likes')),
          comments: Number(fd.get('comments')),
          shares:   Number(fd.get('shares')),
          saves:    Number(fd.get('saves')),
        });
        if (!result.success) { setError(result.error ?? 'Hata oluştu.'); return; }
        setDone(true);
        setTimeout(onClose, 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sunucu hatası.');
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto rounded-[var(--radius-lg)] overflow-hidden shadow-2xl"
          style={{ background: 'var(--color-bg-secondary)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Verileri Güncelle
              </h2>
              <p className="text-xs mt-0.5 truncate max-w-[280px]"
                style={{ color: 'var(--color-text-muted)' }}>
                {post.title}
              </p>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-[var(--radius-md)] transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.name} className={`flex flex-col gap-1.5 ${f.name === 'views' ? 'col-span-2' : ''}`}>
                  <label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{f.icon}</span> {f.label}
                  </label>
                  <input
                    name={f.name}
                    type="number"
                    min="0"
                    defaultValue={f.defaultVal}
                    required
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            {/* Etkileşim oranı bilgisi */}
            <p className="mt-3 text-[11px] px-3 py-2 rounded-[var(--radius-sm)]"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
              Etkileşim Oranı otomatik hesaplanır: ((beğeni + yorum + yer işareti) ÷ görüntülenme) × 100
            </p>

            {error && (
              <p className="mt-3 text-xs px-3 py-2 rounded-[var(--radius-md)]"
                style={{ color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            {done && (
              <p className="mt-3 text-xs px-3 py-2 rounded-[var(--radius-md)] text-center font-semibold"
                style={{ color: 'var(--color-success)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                ✓ Veriler güncellendi
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold border transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                İptal
              </button>
              <button type="submit" disabled={pending || done}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] text-sm font-bold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'var(--color-accent)' }}>
                {pending
                  ? <><Loader2 size={14} className="animate-spin" /> Kaydediliyor…</>
                  : done ? '✓ Kaydedildi' : 'Verileri Kaydet'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Full Management Table ─────────────────────────────────────────────────────

function ManagementTable({ posts }: { posts: SpecialPost[] }) {
  const [editingPost, setEditingPost] = useState<SpecialPost | null>(null);

  return (
    <>
      <div className="rounded-[var(--radius-md)] border overflow-x-auto"
        style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
              {['İçerik', 'Yazar', 'Ekip', 'Platformlar', 'Durum', 'İzl.', 'Beğ.', 'Yorum', 'Paylaşım', 'Kaydedilen', 'ETKİLEŞİM', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((post, i) => (
              <tr key={post.id}
                style={{
                  background: i % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                <td className="px-3 py-3">
                  <p className="font-medium text-xs truncate max-w-[160px]"
                    style={{ color: 'var(--color-text-primary)' }}>{post.title}</p>
                  <p className="text-[11px] truncate max-w-[160px]"
                    style={{ color: 'var(--color-text-muted)' }}>{post.content_type}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {post.author?.full_name ?? '—'}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <div className="text-[11px] space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {post.editor?.full_name   && <p>✏️ {post.editor.full_name}</p>}
                    {post.designer?.full_name && <p>🎨 {post.designer.full_name}</p>}
                    {!post.editor && !post.designer && <p>—</p>}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {post.platforms.join(', ')}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                    style={{
                      color: STATUS_COLORS[post.status],
                      background: `color-mix(in srgb, ${STATUS_COLORS[post.status]} 12%, transparent)`,
                    }}>
                    {STATUS_LABELS[post.status]}
                  </span>
                </td>
                {[post.views, post.likes, post.comments, post.shares, post.saves].map((v, idx) => (
                  <td key={idx} className="px-3 py-3 text-xs font-medium tabular-nums"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {fmt(v)}
                  </td>
                ))}
                <td className="px-3 py-3">
                  <span className="text-xs font-bold"
                    style={{ color: post.engagement_rate >= 5 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                    %{post.engagement_rate.toFixed(1)}
                  </span>
                </td>
                {/* Düzenle butonu */}
                <td className="px-3 py-3">
                  <button
                    onClick={() => setEditingPost(post)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold border transition-colors hover:opacity-80"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      background: 'var(--color-bg-tertiary)',
                    }}
                    title="Verileri Güncelle">
                    <Pencil size={11} /> Güncelle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-sm">Henüz içerik yok.</p>
          </div>
        )}
      </div>

      {/* Metrics Modal */}
      {editingPost && (
        <MetricsModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
    </>
  );
}

// ── Main Admin View ───────────────────────────────────────────────────────────

export function AdminView({
  allPosts,
  allUsers,
}: {
  allPosts: SpecialPost[];
  allUsers: User[];
}) {
  const insights = computeInsights(allPosts, allUsers);
  const pending  = allPosts.filter(p => p.status === 'ONAY_BEKLIYOR');

  return (
    <div className="space-y-8">

      {/* ── Insight Kartları ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InsightCard
          icon={<Trophy size={16} />}
          label="En Çok Tutan Platform"
          value={insights.topPlatform}
          sub={`${allPosts.filter(p => p.status === 'YAYINLANDI' && p.platforms.includes(insights.topPlatform)).length} yayınlanan içerik`}
        />
        <InsightCard
          icon={<Layers size={16} />}
          label="En Yüksek Etkileşim Türü"
          value={insights.topContentType?.type ?? '—'}
          sub={insights.topContentType ? `Ort. %${insights.topContentType.avg.toFixed(1)} etkileşim` : 'Yeterli veri yok'}
        />
        <InsightCard
          icon={<Users size={16} />}
          label="En Başarılı Üretici"
          value={insights.topCreator?.full_name ?? '—'}
          sub={insights.topCreator ? `${fmt(insights.topCreatorViews)} toplam izlenme` : 'Yeterli veri yok'}
        />
      </div>

      {/* ── Onay Havuzu ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Fikir Onay Havuzu
          </h2>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)' }}>
              {pending.length} bekliyor
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="py-10 text-center rounded-[var(--radius-md)] border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            <CheckCircle2 size={20} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Onay bekleyen fikir yok.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(post => (
              <ApprovalRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* ── Genel Yönetim Tablosu ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Tüm İçerikler
          </h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {allPosts.length} kayıt
          </span>
        </div>
        <ManagementTable posts={allPosts} />
      </div>

    </div>
  );
}
