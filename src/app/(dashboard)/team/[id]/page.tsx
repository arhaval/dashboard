/**
 * Team Member Profile Page
 * Admin: tüm üyelerin profilini görebilir
 * Üye: sadece kendi profilini görebilir
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { userService, financeService, workItemService } from '@/services';
import { tr } from '@/lib/i18n';
import { ArrowLeft } from 'lucide-react';
import { MemberProfileCard } from './member-profile-card';
import { MemberTransactions } from './member-transactions';
import { MemberWork } from './member-work';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberProfilePage({ params }: PageProps) {
  const { id } = await params;

  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';
  const isOwnProfile = currentUser.id === id;

  if (!isAdmin && !isOwnProfile) {
    redirect('/');
  }

  const member = await userService.getById(id);
  if (!member) notFound();

  const [transactions, stats, workItems] = await Promise.all([
    isAdmin ? financeService.getByUserId(id) : Promise.resolve([]),
    isAdmin
      ? financeService.getUserStats(id)
      : Promise.resolve({ totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 }),
    isAdmin ? workItemService.getAll({ user_id: id }) : Promise.resolve([]),
  ]);

  return (
    <PageShell
      title={isOwnProfile ? 'Profilim' : tr.team.memberDetails}
      description={member.full_name}
      actions={
        <Link href={isAdmin ? '/team' : '/'}>
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tr.actions.back}
          </Button>
        </Link>
      }
    >
      <MemberProfileCard member={member} stats={stats} />

      {isAdmin && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            İş Takibi
          </h3>
          <MemberWork workItems={workItems} />
        </div>
      )}

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
