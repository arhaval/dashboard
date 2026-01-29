'use client';

/**
 * Member Actions Component
 * Admin-only controls for role and status management
 */

import { useState, useTransition } from 'react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { updateTeamMemberRole, toggleTeamMemberStatus } from './actions';
import type { UserRole } from '@/types';

interface RoleControlProps {
  userId: string;
  currentRole: UserRole;
  isCurrentUser: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PUBLISHER', label: 'Publisher' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VOICE', label: 'Voice' },
];

export function RoleControl({ userId, currentRole, isCurrentUser }: RoleControlProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Current user cannot change their own role
  if (isCurrentUser) {
    return (
      <span
        className={cn(
          'inline-block rounded-full px-2 py-0.5',
          'text-xs font-medium',
          getRoleBadgeStyles(currentRole)
        )}
      >
        {currentRole}
      </span>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    if (newRole === currentRole) return;

    setError(null);
    startTransition(async () => {
      const result = await updateTeamMemberRole(userId, newRole);
      if (!result.success) {
        setError(result.error || 'Failed to update role');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentRole}
        onChange={handleChange}
        disabled={isPending}
        className="h-7 w-28 text-xs"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {error && (
        <span className="text-xs text-[var(--color-error)]" title={error}>
          ⚠
        </span>
      )}
    </div>
  );
}

interface StatusControlProps {
  userId: string;
  isActive: boolean;
  isCurrentUser: boolean;
}

export function StatusControl({ userId, isActive, isCurrentUser }: StatusControlProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Current user cannot deactivate themselves
  if (isCurrentUser) {
    return (
      <span
        className={cn(
          'inline-block rounded-full px-2 py-0.5',
          'text-xs font-medium',
          isActive
            ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
            : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
        )}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  }

  const handleToggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleTeamMemberStatus(userId);
      if (!result.success) {
        setError(result.error || 'Failed to toggle status');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          'inline-block rounded-full px-2 py-0.5',
          'text-xs font-medium transition-colors',
          'cursor-pointer hover:opacity-80',
          isPending && 'opacity-50',
          isActive
            ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
            : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
        )}
      >
        {isPending ? '...' : isActive ? 'Active' : 'Inactive'}
      </button>
      {error && (
        <span className="text-xs text-[var(--color-error)]" title={error}>
          ⚠
        </span>
      )}
    </div>
  );
}

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
