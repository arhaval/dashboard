/**
 * Team Page
 * Lists all team members (Server Component)
 * Admin: full access with CRUD | Others: read-only
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { cn } from '@/lib/utils';
import { AddMemberButton } from './add-member-button';
import { RoleControl, StatusControl } from './member-actions';
import type { User } from '@/types';

function getRoleBadgeStyles(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]';
    case 'PUBLISHER':
      return 'bg-[var(--color-info-muted)] text-[var(--color-info)]';
    case 'EDITOR':
      return 'bg-[var(--color-success-muted)] text-[var(--color-success)]';
    case 'VOICE':
      return 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]';
    default:
      return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface UserTableProps {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

function UserTable({ users, currentUserId, isAdmin }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>No team members found</p>
        {isAdmin && <AddMemberButton />}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Email
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Role
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              Joined
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => {
            const isCurrentUser = user.id === currentUserId;

            return (
              <tr
                key={user.id}
                className={cn(
                  'border-b border-[var(--color-border)] last:border-b-0',
                  index % 2 === 0
                    ? 'bg-[var(--color-table-row-even)]'
                    : 'bg-[var(--color-table-row-odd)]'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center',
                        'rounded-full bg-[var(--color-bg-tertiary)]',
                        'text-sm font-medium text-[var(--color-text-primary)]'
                      )}
                    >
                      {user.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {user.full_name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          (You)
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <RoleControl
                      userId={user.id}
                      currentRole={user.role}
                      isCurrentUser={isCurrentUser}
                    />
                  ) : (
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5',
                        'text-xs font-medium',
                        getRoleBadgeStyles(user.role)
                      )}
                    >
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <StatusControl
                      userId={user.id}
                      isActive={user.is_active}
                      isCurrentUser={isCurrentUser}
                    />
                  ) : (
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5',
                        'text-xs font-medium',
                        user.is_active
                          ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                          : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
                      )}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                  {formatDate(user.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function TeamPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const users = await userService.getAll();

  return (
    <PageShell
      title="Team"
      description="Manage team members"
      actions={isAdmin ? <AddMemberButton /> : undefined}
    >
      {/* Stats Summary (Admin only) */}
      {isAdmin && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Total Members</p>
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {users.length}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Active</p>
            <p className="text-2xl font-semibold text-[var(--color-success)]">
              {users.filter((u) => u.is_active).length}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Inactive</p>
            <p className="text-2xl font-semibold text-[var(--color-error)]">
              {users.filter((u) => !u.is_active).length}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Admins</p>
            <p className="text-2xl font-semibold text-[var(--color-accent)]">
              {users.filter((u) => u.role === 'ADMIN').length}
            </p>
          </div>
        </div>
      )}

      <UserTable users={users} currentUserId={currentUser.id} isAdmin={isAdmin} />
    </PageShell>
  );
}
