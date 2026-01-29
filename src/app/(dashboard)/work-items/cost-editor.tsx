/**
 * Cost Editor Component
 * Minimal client component for editing work item cost (admin only, DRAFT items)
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { updateWorkItemCost } from './actions';

interface CostEditorProps {
  workItemId: string;
  currentCost: number | null;
  canEdit: boolean;
}

function formatCurrency(amount: number | null) {
  if (amount === null) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

export function CostEditor({ workItemId, currentCost, canEdit }: CostEditorProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [cost, setCost] = React.useState(currentCost?.toString() || '');
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!canEdit) {
    return (
      <span className="text-sm font-mono text-[var(--color-text-primary)]">
        {formatCurrency(currentCost)}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          'text-sm font-mono',
          currentCost
            ? 'text-[var(--color-text-primary)]'
            : 'text-[var(--color-accent)] underline underline-offset-2',
          'hover:opacity-80 transition-opacity'
        )}
        title="Click to edit cost"
      >
        {currentCost ? formatCurrency(currentCost) : 'Set cost'}
      </button>
    );
  }

  const handleSave = async () => {
    const numCost = parseFloat(cost);
    if (isNaN(numCost) || numCost <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await updateWorkItemCost(workItemId, numCost);

    setIsPending(false);

    if (result.success) {
      setIsEditing(false);
    } else {
      setError(result.error || 'Failed to update');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCost(currentCost?.toString() || '');
      setError(null);
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      <input
        ref={inputRef}
        type="number"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!isPending) {
            setIsEditing(false);
            setCost(currentCost?.toString() || '');
          }
        }}
        disabled={isPending}
        className={cn(
          'w-24 h-7 px-2 rounded-[var(--radius-sm)]',
          'text-sm font-mono text-right',
          'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]',
          'disabled:opacity-50'
        )}
        placeholder="0"
      />
      <span className="text-xs text-[var(--color-text-muted)]">₺</span>
      {error && (
        <span className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-[var(--color-error)]">
          {error}
        </span>
      )}
    </div>
  );
}
