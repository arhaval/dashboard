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
import { contentQueueService } from '@/services/content-queue.service';
import { ideaService } from '@/services/idea.service';
import { ROLE_STAGES } from '@/app/(dashboard)/icerik-plani/content-queue.constants';
import { tr } from '@/lib/i18n';
import { ArrowLeft } from 'lucide-react';
import { InstallCard } from '@/components/notifications/install-card';
import { MemberProfileCard } from './member-profile-card';
import { MemberTransactions } from './member-transactions';
import { MemberWork } from './member-work';
import { MemberAssignedContent } from './member-assigned-content';
import { MemberIdeaStats } from './member-idea-stats';

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

  // Members see their OWN work items on their profile; financial transactions
  // stay admin-only.
  const canSeeWork = isAdmin || isOwnProfile;
  // Content the member is responsible for at the current pipeline stage (by role).
  const showAssignedContent = canSeeWork && Boolean(ROLE_STAGES[member.role]);
  const [transactions, stats, workItems, assignedContent, ideaStats] = await Promise.all([
    isAdmin ? financeService.getByUserId(id) : Promise.resolve([]),
    isAdmin
      ? financeService.getUserStats(id)
      : Promise.resolve({ totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 }),
    canSeeWork ? workItemService.getAll({ user_id: id }) : Promise.resolve([]),
    showAssignedContent ? contentQueueService.getAssignedForUser(id, member.role) : Promise.resolve([]),
    // Ideas this member contributed that became content, with their real numbers.
    canSeeWork ? ideaService.getAuthorOutcomes(id) : Promise.resolve([]),
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

      {/* Install the PWA — own profile only; hides itself once installed. */}
      {isOwnProfile && <InstallCard />}

      {showAssignedContent && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Sana Düşen İçerikler
          </h3>
          <MemberAssignedContent items={assignedContent} />
        </div>
      )}

      {canSeeWork && ideaStats.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Fikirlerinin Getirisi
          </h3>
          <MemberIdeaStats stats={ideaStats} />
        </div>
      )}

      {canSeeWork && (
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
