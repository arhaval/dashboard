'use client';

/**
 * AddPlanForm — Yeni içerik planı ekleme formu
 * Opens as a slide-in panel / modal overlay.
 */

import { useRef, useState, useTransition } from 'react';
import { createContentPlan } from './actions';
import { X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddPlanFormProps {
  defaultDate?: string; // YYYY-MM-DD
  members: Array<{ id: string; full_name: string }>;
  onClose: () => void;
}

const CONTENT_TYPES = [
  { value: 'VOICE', label: 'Seslendirme' },
  { value: 'EDIT', label: 'Kurgu' },
  { value: 'STREAM', label: 'Yayın' },
];

// Platform + subtype mapping — STREAM has no goal platform
const PLATFORM_OPTIONS = [
  { value: '', label: '— Seçiniz —' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'Twitter / X' },
];

const SUBTYPE_BY_PLATFORM: Record<string, Array<{ value: string; label: string }>> = {
  YOUTUBE: [
    { value: 'VIDEO', label: 'Video' },
    { value: 'SHORTS', label: 'Shorts' },
  ],
  INSTAGRAM: [
    { value: 'REELS', label: 'Reels' },
    { value: 'POST', label: 'Gönderi' },
  ],
  X: [
    { value: 'POST', label: 'Tweet / Gönderi' },
  ],
};

const PRIORITIES = [
  { value: 'LOW', label: 'Düşük' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Yüksek' },
  { value: 'URGENT', label: 'Acil' },
];

export function AddPlanForm({ defaultDate, members, onClose }: AddPlanFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createContentPlan(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md',
          'bg-[var(--color-bg-primary)] shadow-2xl',
          'flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Yeni İçerik Planı
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Takvime yeni içerik görevi ekle
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Başlık *
            </label>
            <input
              name="title"
              required
              placeholder="İçerik başlığı"
              className={cn(
                'w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
                'bg-[var(--color-bg-secondary)] px-3 py-2',
                'text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                'outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-colors'
              )}
            />
          </div>

          {/* Content Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              İçerik Türü *
            </label>
            <div className="flex gap-2">
              {CONTENT_TYPES.map((type) => (
                <label key={type.value} className="flex-1">
                  <input
                    type="radio"
                    name="content_type"
                    value={type.value}
                    defaultChecked={type.value === 'VOICE'}
                    className="peer sr-only"
                  />
                  <span className={cn(
                    'flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)]',
                    'px-3 py-2 text-xs font-medium text-[var(--color-text-muted)]',
                    'transition-all peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent-muted)] peer-checked:text-[var(--color-accent)]'
                  )}>
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Tarih *
            </label>
            <input
              type="date"
              name="planned_date"
              required
              defaultValue={defaultDate}
              className={cn(
                'w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
                'bg-[var(--color-bg-secondary)] px-3 py-2',
                'text-sm text-[var(--color-text-primary)]',
                'outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-colors'
              )}
            />
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Atanacak Kişi
            </label>
            <select
              name="assigned_to"
              className={cn(
                'w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
                'bg-[var(--color-bg-secondary)] px-3 py-2',
                'text-sm text-[var(--color-text-primary)]',
                'outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-colors'
              )}
            >
              <option value="">— Seçiniz —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Öncelik
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <label key={p.value}>
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    defaultChecked={p.value === 'NORMAL'}
                    className="peer sr-only"
                  />
                  <span className={cn(
                    'flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)]',
                    'px-2 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)]',
                    'transition-all peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent-muted)] peer-checked:text-[var(--color-accent)]'
                  )}>
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Yayınlanacak Platform
            </label>
            <select
              name="platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className={cn(
                'w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
                'bg-[var(--color-bg-secondary)] px-3 py-2',
                'text-sm text-[var(--color-text-primary)]',
                'outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-colors'
              )}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Sub-type — only shown when platform selected */}
          {selectedPlatform && SUBTYPE_BY_PLATFORM[selectedPlatform] && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                İçerik Alt Türü
              </label>
              <div className="flex gap-2">
                {SUBTYPE_BY_PLATFORM[selectedPlatform].map((st) => (
                  <label key={st.value} className="flex-1">
                    <input
                      type="radio"
                      name="content_subtype"
                      value={st.value}
                      defaultChecked={SUBTYPE_BY_PLATFORM[selectedPlatform][0].value === st.value}
                      className="peer sr-only"
                    />
                    <span className={cn(
                      'flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)]',
                      'px-3 py-2 text-xs font-medium text-[var(--color-text-muted)]',
                      'transition-all peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent-muted)] peer-checked:text-[var(--color-accent)]'
                    )}>
                      {st.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Notlar
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Ek notlar (isteğe bağlı)"
              className={cn(
                'w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)]',
                'bg-[var(--color-bg-secondary)] px-3 py-2',
                'text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                'outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-colors'
              )}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-error-muted)] px-3 py-2 text-xs text-[var(--color-error)]">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={cn(
                'flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)]',
                'px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)]',
                'hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50'
              )}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'flex flex-1 items-center justify-center gap-2',
                'rounded-[var(--radius-md)] bg-[var(--color-accent)]',
                'px-4 py-2 text-sm font-medium text-white',
                'hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60'
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isPending ? 'Kaydediliyor…' : 'Planı Ekle'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
