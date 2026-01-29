/**
 * Work Item Filters Component
 * Client component for filter controls
 * Uses URL search params for server-side filtering
 */

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import type { User } from '@/types';

interface WorkItemFiltersProps {
  currentStatus?: string;
  currentType?: string;
  currentUserId?: string;
  users: User[];
  isAdmin: boolean;
}

const statusOptions = [
  { value: '', label: tr.filter.allStatus },
  { value: 'DRAFT', label: tr.filter.draft },
  { value: 'APPROVED', label: tr.filter.approved },
  { value: 'PAID', label: tr.filter.paid },
];

const typeOptions = [
  { value: '', label: tr.filter.allTypes },
  { value: 'STREAM', label: tr.workItem.type.STREAM },
  { value: 'VOICE', label: tr.workItem.type.VOICE },
  { value: 'EDIT', label: tr.workItem.type.EDIT },
];

export function WorkItemFilters({
  currentStatus,
  currentType,
  currentUserId,
  users,
  isAdmin,
}: WorkItemFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/work-items?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/work-items');
  };

  const hasActiveFilters = currentStatus || currentType || currentUserId;

  const selectClassName = cn(
    'h-9 rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
    'px-3 text-sm',
    'text-[var(--color-text-primary)]',
    'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Status Filter */}
      <select
        value={currentStatus || ''}
        onChange={(e) => updateFilter('status', e.target.value)}
        className={selectClassName}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Type Filter */}
      <select
        value={currentType || ''}
        onChange={(e) => updateFilter('type', e.target.value)}
        className={selectClassName}
      >
        {typeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* User Filter (Admin only) */}
      {isAdmin && users.length > 0 && (
        <select
          value={currentUserId || ''}
          onChange={(e) => updateFilter('user_id', e.target.value)}
          className={selectClassName}
        >
          <option value="">{tr.filter.allUsers}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}
            </option>
          ))}
        </select>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className={cn(
            'h-9 rounded-[var(--radius-md)] px-3',
            'text-sm text-[var(--color-text-muted)]',
            'hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
            'transition-colors'
          )}
        >
          {tr.filter.clearFilters}
        </button>
      )}
    </div>
  );
}
