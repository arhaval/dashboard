'use client';

/**
 * Team Table Component
 * Client component with edit functionality
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { Pencil, Phone, CreditCard } from 'lucide-react';
import { RoleControl, StatusControl } from './member-actions';
import { EditMemberModal } from './edit-member-modal';
import { AddMemberButton } from './add-member-button';
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
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface TeamTableProps {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

export function TeamTable({ users, currentUserId, isAdmin }: TeamTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);

  if (users.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.team.noMembers}</p>
        {isAdmin && <AddMemberButton />}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.team.name}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.team.email}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.team.role}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.team.status}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                {tr.team.joined}
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                  {tr.table.actions}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const isCurrentUser = user.id === currentUserId;
              const hasContactInfo = user.phone || user.iban;

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
                        <div className="flex items-center gap-2">
                          {isCurrentUser && (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {tr.team.you}
                            </span>
                          )}
                          {hasContactInfo && (
                            <div className="flex items-center gap-1">
                              {user.phone && (
                                <Phone className="h-3 w-3 text-[var(--color-success)]" />
                              )}
                              {user.iban && (
                                <CreditCard className="h-3 w-3 text-[var(--color-info)]" />
                              )}
                            </div>
                          )}
                        </div>
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
                        {tr.roles[user.role as keyof typeof tr.roles] || user.role}
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
                        {user.is_active ? tr.team.active : tr.team.inactive}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                    {formatDate(user.created_at)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingUser(user)}
                        className={cn(
                          'inline-flex items-center justify-center',
                          'h-8 w-8 rounded-[var(--radius-sm)]',
                          'text-[var(--color-text-muted)]',
                          'hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
                          'transition-colors'
                        )}
                        title={tr.team.editMember}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <EditMemberModal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        user={editingUser}
      />
    </>
  );
}
