/**
 * Team Page
 * Lists all team members (Server Component)
 * Admin: full access with CRUD | Others: read-only
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { tr } from '@/lib/i18n';
import { AddMemberButton } from './add-member-button';
import { TeamTable } from './team-table';

export default async function TeamPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const users = await userService.getAll();

  return (
    <PageShell
      title={tr.team.title}
      description={tr.team.subtitle}
      actions={isAdmin ? <AddMemberButton /> : undefined}
    >
      {/* Stats Summary (Admin only) */}
      {isAdmin && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">{tr.team.totalMembers}</p>
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {users.length}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">{tr.team.active}</p>
            <p className="text-2xl font-semibold text-[var(--color-success)]">
              {users.filter((u) => u.is_active).length}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">{tr.team.inactive}</p>
            <p className="text-2xl font-semibold text-[var(--color-error)]">
              {users.filter((u) => !u.is_active).length}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">{tr.team.admins}</p>
            <p className="text-2xl font-semibold text-[var(--color-accent)]">
              {users.filter((u) => u.role === 'ADMIN').length}
            </p>
          </div>
        </div>
      )}

      <TeamTable users={users} currentUserId={currentUser.id} isAdmin={isAdmin} />
    </PageShell>
  );
}
