/**
 * Team Member Profile Page
 * Shows detailed information about a team member.
 * Admin-only access. Orchestrates data fetching and composes sub-components.
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { userService, financeService } from '@/services';
import { tr } from '@/lib/i18n';
import { ArrowLeft } from 'lucide-react';
import { MemberProfileCard } from './member-profile-card';
import { MemberTransactions } from './member-transactions';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TeamMemberProfilePage({ params }: PageProps) {
  const { id } = await params;

  // Get current user and verify admin access
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/team');
  }

  // Get the team member
  const member = await userService.getById(id);

  if (!member) {
    notFound();
  }

  // Get transactions and stats for this user
  const [transactions, stats] = await Promise.all([
    financeService.getByUserId(id),
    financeService.getUserStats(id),
  ]);

  return (
    <PageShell
      title={tr.team.memberDetails}
      description={member.full_name}
      actions={
        <Link href="/team">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tr.actions.back}
          </Button>
        </Link>
      }
    >
      <MemberProfileCard member={member} stats={stats} />

      {/* Recent Transactions */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Son İşlemler
        </h3>
        <MemberTransactions transactions={transactions} />
      </div>
    </PageShell>
  );
}
