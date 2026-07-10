'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { X, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { createIncomeAction, createExpenseAction } from './actions';

type Tab = 'income' | 'expense';

const INCOME_CATS = [
  { value: 'SPONSORLUK', label: 'Sponsorluk' },
  { value: 'REKLAM',     label: 'Reklam'     },
  { value: 'TURNUVA',    label: 'Turnuva'     },
  { value: 'DIGER',      label: 'Diğer'       },
];

const EXPENSE_CATS = [
  'Ekipman', 'Sunucu / Altyapı', 'Pazarlama',
  'Ödül / Ödeme', 'Etkinlik', 'Lisans / Yazılım', 'Diğer',
];

// ── Alan wrapper ──────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = [
  'w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-sm',
  'bg-[var(--color-bg-primary)] border-[var(--color-border)]',
  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
  'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
  'transition-shadow',
].join(' ');

// ── Modal ─────────────────────────────────────────────────────────────────────

export function AddEntryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('income');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  useEffect(() => { if (open) { setError(null); setDone(false); } }, [open]);

  if (!open) return null;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    start(async () => {
      try {
        if (tab === 'income') await createIncomeAction(fd);
        else                  await createExpenseAction(fd);
        setDone(true);
        formRef.current?.reset();
        setTimeout(onClose, 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto my-8 max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] shadow-2xl"
          style={{ background: 'var(--color-bg-secondary)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Yeni Kayıt Ekle
            </h2>
            <button onClick={onClose}
              className="p-1.5 rounded-[var(--radius-md)] transition-colors"
              style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mx-5 mb-4 rounded-[var(--radius-md)] overflow-hidden border"
            style={{ borderColor: 'var(--color-border)' }}>
            <button type="button"
              onClick={() => { setTab('income'); setError(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: tab === 'income' ? 'var(--color-success)' : 'transparent',
                color: tab === 'income' ? '#fff' : 'var(--color-text-secondary)',
              }}>
              <TrendingUp size={14} />
              Beklenen Gelir
            </button>
            <button type="button"
              onClick={() => { setTab('expense'); setError(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: tab === 'expense' ? 'var(--color-error)' : 'transparent',
                color: tab === 'expense' ? '#fff' : 'var(--color-text-secondary)',
              }}>
              <TrendingDown size={14} />
              Beklenen Gider
            </button>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={submit} className="px-5 pb-5 space-y-4">

            <Field label="Başlık / Açıklama" required>
              <input name="title" required
                placeholder={tab === 'income' ? 'ör. ABC Sponsorluk Ödemesi' : 'ör. Sunucu Faturası — Haziran'}
                className={inputCls} />
            </Field>

            <Field label="Tutar (₺)" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: 'var(--color-text-muted)' }}>₺</span>
                <input name="amount" type="number" min="1" step="0.01" required
                  placeholder="0" className={`${inputCls} pl-7`} />
              </div>
            </Field>

            <Field label="Kategori" required>
              <select name="category" required className={inputCls}>
                {tab === 'income'
                  ? INCOME_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)
                  : EXPENSE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label={tab === 'income' ? 'Tahmini Geliş Tarihi' : 'Son Ödeme Tarihi'} required>
              <input name={tab === 'income' ? 'expected_date' : 'due_date'}
                type="date" required className={inputCls} />
            </Field>

            <Field label="Notlar / Detay">
              <textarea name="notes" rows={2}
                placeholder={tab === 'income'
                  ? 'Sözleşme no, iletişim kişisi, koşullar...'
                  : 'Fatura no, tedarikçi, açıklama...'}
                className={`${inputCls} resize-none`} />
            </Field>

            {error && (
              <p className="text-xs rounded-[var(--radius-md)] px-3 py-2"
                style={{ color: 'var(--color-error)', background: 'rgba(238,93,80,0.08)', border: '1px solid rgba(238,93,80,0.2)' }}>
                {error}
              </p>
            )}

            {done && (
              <p className="text-xs rounded-[var(--radius-md)] px-3 py-2 text-center font-semibold"
                style={{ color: 'var(--color-success)', background: 'rgba(1,181,116,0.08)', border: '1px solid rgba(1,181,116,0.2)' }}>
                ✓ Kaydedildi
              </p>
            )}

            <button type="submit" disabled={pending || done}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] text-sm font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: tab === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>
              {pending
                ? <><Loader2 size={15} className="animate-spin" /> Kaydediliyor…</>
                : done ? '✓ Kaydedildi'
                : tab === 'income' ? 'Gelir Kaydı Ekle' : 'Gider Kaydı Ekle'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
