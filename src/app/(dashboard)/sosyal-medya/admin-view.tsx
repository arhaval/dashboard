'use client';

import { useState, useTransition } from 'react';
import {
  CheckCircle2, XCircle, ChevronDown, Eye, Heart,
  MessageCircle, Share2, Bookmark, BarChart3,
  Trophy, Users, Layers, Loader2,
} from 'lucide-react';
import { reviewContentIdea } from '@/app/actions/social-actions';
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

function ApprovalRow({
  post,
  editors,
  designers,
}: {
  post: SpecialPost;
  editors: User[];
  designers: User[];
}) {
  const [pending, start] = useTransition();
  const [open, setOpen]  = useState(false);
  const [editorId,   setEditorId]   = useState('');
  const [designerId, setDesignerId] = useState('');
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  function approve() {
    start(async () => {
      try {
        await reviewContentIdea(post.id, 'ONAYLANDI', editorId || undefined, designerId || undefined);
        setDone('approved');
      } catch { /* handled */ }
    });
  }

  function reject() {
    start(async () => {
      try {
        await reviewContentIdea(post.id, 'REDDEDILDI');
        setDone('rejected');
      } catch { /* handled */ }
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
          : <XCircle size={14} style={{ color: 'var(--color-error)' }} />
        }
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          <span className="font-bold">{post.title}</span>
          {done === 'approved' ? ' — Onaylandı' : ' — Reddedildi'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', opacity: pending ? 0.6 : 1 }}>

      {/* Ana satır */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {post.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {post.author?.full_name}
            </span>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {post.content_type}
            </span>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {post.platforms.join(', ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Atama dropdown */}
          <div className="relative">
            <button onClick={() => setOpen(x => !x)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Ekip Ata <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 z-30 w-56 rounded-[var(--radius-md)] border shadow-xl p-3 space-y-3"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
                    style={{ color: 'var(--color-text-muted)' }}>Editör</p>
                  <select value={editorId} onChange={e => setEditorId(e.target.value)}
                    className="w-full text-xs rounded-[var(--radius-sm)] border px-2 py-1.5"
                    style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                    <option value="">— Seçilmedi —</option>
                    {editors.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
                    style={{ color: 'var(--color-text-muted)' }}>Grafiker</p>
                  <select value={designerId} onChange={e => setDesignerId(e.target.value)}
                    className="w-full text-xs rounded-[var(--radius-sm)] border px-2 py-1.5"
                    style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                    <option value="">— Seçilmedi —</option>
                    {designers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-full text-xs py-1.5 rounded-[var(--radius-sm)] font-semibold"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  Kapat
                </button>
              </div>
            )}
          </div>

          {/* Reddet */}
          <button onClick={reject} disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] transition-colors disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <XCircle size={13} /> Reddet
          </button>

          {/* Onayla */}
          <button onClick={approve} disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-success)' }}>
            {pending
              ? <Loader2 size={13} className="animate-spin" />
              : <CheckCircle2 size={13} />
            }
            Onayla
          </button>
        </div>
      </div>

      {/* Caption preview */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-xs line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
            {post.caption}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Full Management Table ─────────────────────────────────────────────────────

function ManagementTable({ posts }: { posts: SpecialPost[] }) {
  return (
    <div className="rounded-[var(--radius-md)] border overflow-x-auto"
      style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
            {['İçerik', 'Yazar', 'Ekip', 'Platformlar', 'Durum', 'İzl.', 'Beğ.', 'Yorum', 'Paylaşım', 'Kaydedilen', 'ETKİLEŞİM'].map(h => (
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
                <td key={idx} className="px-3 py-3 text-xs font-medium"
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
  const insights  = computeInsights(allPosts, allUsers);
  const pending   = allPosts.filter(p => p.status === 'ONAY_BEKLIYOR');
  const editors   = allUsers.filter(u => u.role === 'EDITOR');
  const designers = allUsers.filter(u => u.role === 'GRAFIKER');

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
              <ApprovalRow
                key={post.id}
                post={post}
                editors={editors}
                designers={designers}
              />
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
