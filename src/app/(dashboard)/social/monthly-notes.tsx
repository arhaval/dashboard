'use client';

/**
 * Monthly Notes - Simple textarea for month evaluation context
 * Admin can edit, non-admin can only read
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { upsertMonthlyNote } from './metrics-actions';

interface MonthlyNotesProps {
  month: string;
  initialNotes: string;
  isAdmin: boolean;
}

export function MonthlyNotes({ month, initialNotes, isAdmin }: MonthlyNotesProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const hasChanged = notes !== initialNotes;

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    const result = await upsertMonthlyNote(month, notes);

    if (result.success) {
      setFeedback({ type: 'success', message: 'Not kaydedildi' });
      router.refresh();
      setTimeout(() => setFeedback(null), 2000);
    } else {
      setFeedback({ type: 'error', message: result.error || 'Kaydetme hatası' });
    }

    setSaving(false);
  }

  const monthLabel = (() => {
    const [y, m] = month.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];
    return `${monthNames[parseInt(m) - 1]} ${y}`;
  })();

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Ay Notu — {monthLabel}
        </h3>
        {isAdmin && hasChanged && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        )}
      </div>

      {isAdmin ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bu ay neler yapıldı? Turnuvalar, kampanyalar, önemli olaylar..."
          className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          rows={3}
        />
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]">
          {notes || 'Henüz not eklenmemiş.'}
        </p>
      )}

      {feedback && (
        <p
          className={`mt-2 text-xs ${
            feedback.type === 'success'
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-error)]'
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
