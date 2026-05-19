/**
 * Team Member Profile Page
 * Admin: tüm üyelerin profilini görebilir
 * Üye: sadece kendi profilini görebilir
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { userService, financeService, specialPostService } from '@/services';
import { tr } from '@/lib/i18n';
import { ArrowLeft, Lightbulb, CheckCircle2, Eye, TrendingUp } from 'lucide-react';
import { MemberProfileCard } from './member-profile-card';
import { MemberTransactions } from './member-transactions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function IdeaStatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
    >
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

export default async function TeamMemberProfilePage({ params }: PageProps) {
  const { id } = await params;

  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  // Admin her profili görebilir; diğerleri sadece kendini
  const isAdmin = currentUser.role === 'ADMIN';
  const isOwnProfile = currentUser.id === id;

  if (!isAdmin && !isOwnProfile) {
    redirect('/content/ideas');
  }

  const member = await userService.getById(id);
  if (!member) notFound();

  // Finansal veriler sadece admin için
  const [transactions, stats, memberPosts] = await Promise.all([
    isAdmin ? financeService.getByUserId(id) : Promise.resolve([]),
    isAdmin ? financeService.getUserStats(id) : Promise.resolve({ totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 }),
    specialPostService.getAll({ author_id: id }),
  ]);

  // Fikir istatistikleri
  const ideaStats = {
    total:       memberPosts.length,
    approved:    memberPosts.filter(p => p.status === 'ONAYLANDI' || p.status === 'YAYINLANDI').length,
    published:   memberPosts.filter(p => p.status === 'YAYINLANDI').length,
    totalViews:  memberPosts.filter(p => p.status === 'YAYINLANDI').reduce((s, p) => s + (p.views || 0), 0),
    approvalRate: memberPosts.length > 0
      ? Math.round(
          (memberPosts.filter(p => p.status === 'ONAYLANDI' || p.status === 'YAYINLANDI').length
            / memberPosts.length) * 100
        )
      : 0,
  };

  function fmtViews(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  }

  return (
    <PageShell
      title={isOwnProfile ? 'Profilim' : tr.team.memberDetails}
      description={member.full_name}
      actions={
        <Link href={isAdmin ? '/team' : '/content/ideas'}>
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tr.actions.back}
          </Button>
        </Link>
      }
    >
      <MemberProfileCard member={member} stats={stats} />

      {/* ── İçerik İstatistikleri ── */}
      <div className="mt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          İçerik İstatistikleri
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <IdeaStatCard
            icon={<Lightbulb size={16} />}
            label="Gönderilen Fikir"
            value={ideaStats.total}
          />
          <IdeaStatCard
            icon={<CheckCircle2 size={16} />}
            label="Onaylanan"
            value={ideaStats.approved}
            color="var(--color-info)"
          />
          <IdeaStatCard
            icon={<TrendingUp size={16} />}
            label="Yayınlanan"
            value={ideaStats.published}
            color="var(--color-success)"
          />
          <IdeaStatCard
            icon={<TrendingUp size={16} />}
            label="Tutma Oranı"
            value={`%${ideaStats.approvalRate}`}
            color={ideaStats.approvalRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)'}
          />
          <IdeaStatCard
            icon={<Eye size={16} />}
            label="Toplam Görüntülenme"
            value={ideaStats.totalViews > 0 ? fmtViews(ideaStats.totalViews) : '—'}
            color="var(--color-text-secondary)"
          />
        </div>
      </div>

      {/* Finansal işlemler sadece admin görür */}
      {isAdmin && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Son İşlemler
          </h3>
          <MemberTransactions transactions={transactions} />
        </div>
      )}
    </PageShell>
  );
}
