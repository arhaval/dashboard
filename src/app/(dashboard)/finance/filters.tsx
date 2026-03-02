/**
 * Finance Filters Component
 * Client component for filter controls
 * Preserves month param when changing type/category filters
 */

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';

interface FinanceFiltersProps {
  currentType?: string;
  currentCategory?: string;
  currentMonth: string;
  categories: string[];
}

const typeOptions = [
  { value: '', label: tr.filter.allTypes },
  { value: 'INCOME', label: tr.filter.income },
  { value: 'EXPENSE', label: tr.filter.expense },
];

export function FinanceFilters({ currentType, currentCategory, currentMonth, categories }: FinanceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Always preserve month
    if (!params.has('month')) {
      params.set('month', currentMonth);
    }

    router.push(`/finance?${params.toString()}`);
  };

  const clearFilters = () => {
    // Clear type/category but keep month
    router.push(`/finance?month=${currentMonth}`);
  };

  const hasActiveFilters = currentType || currentCategory;

  const selectClassName = cn(
    'h-9 rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
    'px-3 text-sm',
    'text-[var(--color-text-primary)]',
    'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
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

      {/* Category Filter */}
      {categories.length > 0 && (
        <select
          value={currentCategory || ''}
          onChange={(e) => updateFilter('category', e.target.value)}
          className={selectClassName}
        >
          <option value="">{tr.filter.allCategories}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
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
