'use client';

/**
 * "Kimin için?" seçici — iş girişinde firmayı BİLEREK seçtirmek için büyük,
 * varsayılansız butonlar. Yanlış firmaya girilen yayın yanlış ücretle ve
 * yanlış rapora gider; açılır menüde gözden kaçan varsayılan bunu doğuruyordu.
 */

import { Building2, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';

interface ClientPickerProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  error?: string;
  disabled?: boolean;
}

export function ClientPicker({ clients, value, onChange, error, disabled }: ClientPickerProps) {
  // İç müşteri (Arhaval) önce, sonra dış ortaklar.
  const ordered = [...clients].sort((a, b) => Number(b.is_internal) - Number(a.is_internal));

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="Kimin için"
        className={cn('grid gap-2', ordered.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}
      >
        {ordered.map((c) => {
          const selected = value === c.id;
          const Icon = c.is_internal ? Building2 : Handshake;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(c.id)}
              className={cn(
                'flex min-h-14 items-center gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-colors',
                selected
                  ? 'border-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-hover)]',
                error && !value && 'border-[var(--color-error)]'
              )}
            >
              <Icon
                className={cn('h-4 w-4 flex-shrink-0', selected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]')}
              />
              <span className="min-w-0">
                <span className={cn('block truncate text-sm font-medium', selected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]')}>
                  {c.name}
                </span>
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  {c.is_internal ? 'Kendi yayınımız' : 'Ekstra iş'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error && !value ? (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">Ücret ve rapor seçtiğin firmaya göre belirlenir.</p>
      )}
    </div>
  );
}
