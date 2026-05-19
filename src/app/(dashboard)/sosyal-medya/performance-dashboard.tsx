'use client';

/**
 * Performance Dashboard
 * İçerik havuzundaki yayınlanmış ve metrikleri girilmiş içeriklerin
 * performans analizi: içerik türü ortalamaları + bireysel sıralama tablosu.
 */

import { useState, useMemo } from 'react';
import { TrendingUp, BarChart3, Eye, Heart, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecialPost } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('tr-TR');
}

function getMonthKey(post: SpecialPost): string {
  // published_at tercih edilir, yoksa updated_at kullanılır
  const date = post.published_at ?? post.updated_at;
  return date.slice(0, 7); // YYYY-MM
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Ocak', '02': 'Şubat', '03': 'Mart',    '04': 'Nisan',
  '05': 'Mayıs','06': 'Haziran','07': 'Temmuz',  '08': 'Ağustos',
  '09': 'Eylül','10': 'Ekim',  '11': 'Kasım',   '12': 'Aralık',
};

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[month] ?? month} ${year}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContentTypeStats {
  type: string;
  count: number;
  avgEngagement: number;
  totalViews: number;
  totalLikes: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[var(--color-accent)]">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{sub}</p>
      )}
    </div>
  );
}

function ContentTypeBar({
  stats,
  maxEngagement,
  rank,
}: {
  stats: ContentTypeStats;
  maxEngagement: number;
  rank: number;
}) {
  const pct = maxEngagement > 0 ? (stats.avgEngagement / maxEngagement) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-right font-mono text-xs text-[var(--color-text-muted)]">
        {rank}
      </span>
      <div className="w-24 shrink-0 text-xs text-[var(--color-text-secondary)]">
        {stats.type}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-primary)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]"
            style={{ width: `${pct}%`, transition: 'width 0.4s ease' }}
          />
        </div>
        <span className="w-12 text-right font-mono text-xs font-medium text-[var(--color-text-primary)]">
          %{stats.avgEngagement.toFixed(1)}
        </span>
      </div>
      <span className="w-14 text-right text-xs text-[var(--color-text-muted)]">
        {stats.count} içerik
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface PerformanceDashboardProps {
  posts: SpecialPost[];
}

const PLATFORMS_FILTER = ['Tümü', 'Instagram', 'YouTube', 'X', 'Twitch', 'TikTok'] as const;

export function PerformanceDashboard({ posts }: PerformanceDashboardProps) {
  // Sadece yayınlananlar ve metrikleri girilmişler
  const publishedWithMetrics = useMemo(
    () => posts.filter(
      (p) => p.status === 'YAYINLANDI' && (p.views > 0 || p.engagement_rate > 0)
    ),
    [posts]
  );

  // Kullanılabilir ay listesi
  const availableMonths = useMemo(() => {
    const months = [...new Set(publishedWithMetrics.map(getMonthKey))];
    return months.sort((a, b) => b.localeCompare(a)); // en yeni önce
  }, [publishedWithMetrics]);

  const [selectedMonth, setSelectedMonth] = useState<string>('TÜMÜ');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('Tümü');
  const [sortBy, setSortBy] = useState<'engagement' | 'views' | 'likes'>('engagement');

  // Filtrele
  const filtered = useMemo(() => {
    return publishedWithMetrics.filter((p) => {
      const monthMatch =
        selectedMonth === 'TÜMÜ' || getMonthKey(p) === selectedMonth;
      const platformMatch =
        selectedPlatform === 'Tümü' ||
        p.platforms.some((pl) =>
          pl.toLowerCase() === selectedPlatform.toLowerCase()
        );
      return monthMatch && platformMatch;
    });
  }, [publishedWithMetrics, selectedMonth, selectedPlatform]);

  // İçerik türü istatistikleri
  const contentTypeStats = useMemo((): ContentTypeStats[] => {
    const map: Record<string, { totalEng: number; totalViews: number; totalLikes: number; count: number }> = {};
    for (const p of filtered) {
      if (!map[p.content_type]) {
        map[p.content_type] = { totalEng: 0, totalViews: 0, totalLikes: 0, count: 0 };
      }
      map[p.content_type].totalEng    += p.engagement_rate;
      map[p.content_type].totalViews  += p.views;
      map[p.content_type].totalLikes  += p.likes;
      map[p.content_type].count       += 1;
    }
    return Object.entries(map)
      .map(([type, s]) => ({
        type,
        count:         s.count,
        avgEngagement: s.count > 0 ? s.totalEng / s.count : 0,
        totalViews:    s.totalViews,
        totalLikes:    s.totalLikes,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [filtered]);

  // Sıralı içerik tablosu
  const sortedPosts = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'engagement') return b.engagement_rate - a.engagement_rate;
      if (sortBy === 'views')      return b.views - a.views;
      return b.likes - a.likes;
    });
  }, [filtered, sortBy]);

  const maxEngagement = contentTypeStats[0]?.avgEngagement ?? 0;

  // Özet kartlar için
  const totalViews      = filtered.reduce((s, p) => s + p.views, 0);
  const totalLikes      = filtered.reduce((s, p) => s + p.likes, 0);
  const avgEngagement   = filtered.length > 0
    ? filtered.reduce((s, p) => s + p.engagement_rate, 0) / filtered.length
    : 0;
  const bestType        = contentTypeStats[0]?.type ?? '—';

  if (publishedWithMetrics.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-10 text-center">
        <BarChart3 className="mx-auto mb-3 text-[var(--color-text-muted)]" size={32} />
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Henüz performans verisi yok
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          İçerikleri yayınladıktan sonra metrik gir — grafikler otomatik oluşur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Filtreler ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Ay filtresi */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none"
        >
          <option value="TÜMÜ">Tüm Zamanlar</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>

        {/* Platform filtresi */}
        <div className="flex gap-1.5">
          {PLATFORMS_FILTER.map((pl) => (
            <button
              key={pl}
              onClick={() => setSelectedPlatform(pl)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                selectedPlatform === pl
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              {pl}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {filtered.length} içerik
        </span>
      </div>

      {/* ── Özet Kartlar ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={<Eye size={16} />}
          label="Toplam Görüntülenme"
          value={fmt(totalViews)}
          sub={`${filtered.length} içerik`}
        />
        <SummaryCard
          icon={<Heart size={16} />}
          label="Toplam Beğeni"
          value={fmt(totalLikes)}
        />
        <SummaryCard
          icon={<TrendingUp size={16} />}
          label="Ort. Etkileşim"
          value={`%${avgEngagement.toFixed(1)}`}
        />
        <SummaryCard
          icon={<Award size={16} />}
          label="En İyi Tür"
          value={bestType}
          sub={`%${maxEngagement.toFixed(1)} ort.`}
        />
      </div>

      {/* ── İçerik Türü Performansı ── */}
      {contentTypeStats.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h3 className="mb-4 text-sm font-medium text-[var(--color-text-primary)]">
            İçerik Türü Performansı — Ort. Etkileşim Oranı
          </h3>
          <div className="space-y-3">
            {contentTypeStats.map((stats, i) => (
              <ContentTypeBar
                key={stats.type}
                stats={stats}
                maxEngagement={maxEngagement}
                rank={i + 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── İçerik Sıralaması ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
            İçerik Sıralaması
          </h3>
          {/* Sıralama seçici */}
          <div className="flex gap-1">
            {(
              [
                { key: 'engagement', label: 'Etkileşim' },
                { key: 'views',      label: 'Görüntülenme' },
                { key: 'likes',      label: 'Beğeni' },
              ] as { key: typeof sortBy; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  sortBy === key
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Başlık</th>
                <th className="px-4 py-2.5 text-left font-medium">Platform</th>
                <th className="px-4 py-2.5 text-left font-medium">Tür</th>
                <th className="px-4 py-2.5 text-right font-medium">Görüntülenme</th>
                <th className="px-4 py-2.5 text-right font-medium">Beğeni</th>
                <th className="px-4 py-2.5 text-right font-medium">Yorum</th>
                <th className="px-4 py-2.5 text-right font-medium">Etkileşim</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((post, i) => (
                <tr
                  key={post.id}
                  className={cn(
                    'border-b border-[var(--color-border)] last:border-0',
                    i % 2 === 0
                      ? 'bg-[var(--color-bg-secondary)]'
                      : 'bg-[var(--color-bg-primary)]'
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">
                    {i + 1}
                  </td>
                  <td className="max-w-[200px] px-4 py-3">
                    <span
                      className="block truncate text-[var(--color-text-primary)]"
                      title={post.title}
                    >
                      {post.title}
                    </span>
                    {post.author && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {post.author.full_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--color-bg-primary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                      {post.platforms[0] ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {post.content_type}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-primary)]">
                    {fmt(post.views)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-primary)]">
                    {fmt(post.likes)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-primary)]">
                    {fmt(post.comments)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-mono text-xs font-medium',
                        post.engagement_rate >= 5
                          ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                          : post.engagement_rate >= 2
                          ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                          : 'bg-[var(--color-bg-primary)] text-[var(--color-text-muted)]'
                      )}
                    >
                      %{post.engagement_rate.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
