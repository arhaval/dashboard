'use client';

/**
 * İçerik İstatistikleri — Client
 * Özet kartlar + ekip sıralaması (mobil uyumlu)
 */

import { useState } from 'react';
import { Trophy, Eye, Heart, Lightbulb, TrendingUp } from 'lucide-react';
import type { LeaderboardEntry } from './page';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('tr-TR');
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color: color ?? 'var(--color-accent)' }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

type SortKey = 'approvalRate' | 'totalPublished' | 'totalViews' | 'totalLikes';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'approvalRate',   label: 'Tutma'       },
  { key: 'totalPublished', label: 'Yayınlanan'  },
  { key: 'totalViews',     label: 'Görüntülenme'},
  { key: 'totalLikes',     label: 'Beğeni'      },
];

// ── Mobile Row Card ───────────────────────────────────────────────────────────

function LeaderboardCard({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div
      className="rounded-[var(--radius-md)] border p-3 space-y-2"
      style={{
        borderColor: isMe ? 'var(--color-accent)' : 'var(--color-border)',
        background: isMe ? 'rgba(255,77,0,0.04)' : 'var(--color-bg-secondary)',
      }}
    >
      {/* Name + rank */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-base w-6 shrink-0 text-center">
            {medal ?? <span className="text-xs text-[var(--color-text-muted)]">{rank}</span>}
          </span>
          <span
            className="font-semibold text-sm truncate"
            style={{ color: isMe ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
          >
            {entry.fullName}{isMe && <span className="ml-1 text-xs opacity-60">(sen)</span>}
          </span>
        </div>
        {/* Highlight sort value */}
        <span
          className="rounded-full px-2 py-0.5 font-mono text-xs font-bold shrink-0"
          style={{
            background: entry.approvalRate >= 50
              ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
            color: entry.approvalRate >= 50
              ? 'var(--color-success)' : 'var(--color-warning)',
          }}
        >
          %{entry.approvalRate}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: 'Gönderilen', value: entry.totalSubmitted },
          { label: 'Onaylanan',  value: entry.totalApproved },
          { label: 'Yayınlanan', value: entry.totalPublished, accent: 'var(--color-success)' },
          { label: 'Görüntülenme', value: entry.totalViews > 0 ? fmt(entry.totalViews) : '—' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-1.5">
            <p className="font-mono text-xs font-semibold" style={{ color: accent ?? 'var(--color-text-primary)' }}>
              {value}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  leaderboard: LeaderboardEntry[];
  summary: {
    totalSubmitted: number;
    totalPublished: number;
    totalViews:     number;
    totalLikes:     number;
    overallRate:    number;
  };
  currentUserId: string;
}

export function StatsClient({ leaderboard, summary, currentUserId }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('approvalRate');

  const sorted = [...leaderboard].sort((a, b) => {
    if (sortBy === 'approvalRate')   return b.approvalRate   - a.approvalRate;
    if (sortBy === 'totalPublished') return b.totalPublished - a.totalPublished;
    if (sortBy === 'totalViews')     return b.totalViews     - a.totalViews;
    return b.totalLikes - a.totalLikes;
  });

  if (leaderboard.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-12 text-center">
        <Trophy className="mx-auto mb-3 text-[var(--color-text-muted)]" size={32} />
        <p className="text-sm text-[var(--color-text-secondary)]">Henüz yayınlanan içerik yok.</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Fikirler onaylanıp yayınlandıkça istatistikler burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Özet Kartlar ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          icon={<Lightbulb size={16} />}
          label="Toplam Fikir"
          value={summary.totalSubmitted}
        />
        <SummaryCard
          icon={<TrendingUp size={16} />}
          label="Yayınlanan"
          value={summary.totalPublished}
          color="var(--color-success)"
        />
        <SummaryCard
          icon={<TrendingUp size={16} />}
          label="Genel Tutma"
          value={`%${summary.overallRate}`}
          color={summary.overallRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)'}
        />
        <SummaryCard
          icon={<Eye size={16} />}
          label="Görüntülenme"
          value={summary.totalViews > 0 ? fmt(summary.totalViews) : '—'}
          color="var(--color-info)"
        />
        <SummaryCard
          icon={<Heart size={16} />}
          label="Beğeni"
          value={summary.totalLikes > 0 ? fmt(summary.totalLikes) : '—'}
          color="var(--color-error)"
        />
      </div>

      {/* ── Sıralama ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">

        {/* Başlık + sıralama butonları */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Ekip Sıralaması
            </h3>
          </div>
          <div className="flex gap-1 flex-wrap">
            {SORT_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className="rounded px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[36px]"
                style={{
                  background: sortBy === key ? 'var(--color-accent)' : 'transparent',
                  color: sortBy === key ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: card list */}
        <div className="sm:hidden divide-y divide-[var(--color-border)]">
          {sorted.map((e, i) => (
            <div key={e.userId} className="p-3">
              <LeaderboardCard
                entry={e}
                rank={i + 1}
                isMe={e.userId === currentUserId}
              />
            </div>
          ))}
        </div>

        {/* Desktop: full table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">İsim</th>
                <th className="px-4 py-2.5 text-right font-medium">Gönderilen</th>
                <th className="px-4 py-2.5 text-right font-medium">Onaylanan</th>
                <th className="px-4 py-2.5 text-right font-medium">Yayınlanan</th>
                <th className="px-4 py-2.5 text-right font-medium">Tutma %</th>
                <th className="px-4 py-2.5 text-right font-medium">Görüntülenme</th>
                <th className="px-4 py-2.5 text-right font-medium">Beğeni</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => {
                const isMe = e.userId === currentUserId;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

                return (
                  <tr
                    key={e.userId}
                    className="border-b border-[var(--color-border)] last:border-0 transition-colors"
                    style={{
                      background: isMe
                        ? 'rgba(255,77,0,0.06)'
                        : i % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs w-8 text-[var(--color-text-muted)]">
                      {medal}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-medium"
                        style={{ color: isMe ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                      >
                        {e.fullName}{isMe && <span className="ml-1 text-xs opacity-60">(sen)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-secondary)]">
                      {e.totalSubmitted}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-secondary)]">
                      {e.totalApproved}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: 'var(--color-success)' }}>
                      {e.totalPublished}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-xs font-semibold"
                        style={{
                          background: e.approvalRate >= 50
                            ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                          color: e.approvalRate >= 50
                            ? 'var(--color-success)' : 'var(--color-warning)',
                        }}
                      >
                        %{e.approvalRate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-secondary)]">
                      {e.totalViews > 0 ? fmt(e.totalViews) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-secondary)]">
                      {e.totalLikes > 0 ? fmt(e.totalLikes) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
