/**
 * LedgerList — Tessera dilinde para/kayıt listesi.
 * Satır: renkli ikon kutusu · başlık + alt bilgi · durum rozeti · tutar.
 * Ödemeler, finans, ekstra işler gibi tüm "kayıt listesi" ekranları kullanır.
 */

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export interface LedgerRow {
  id: string;
  icon: LucideIcon;
  /** İkon rengi (CSS değişkeni) — zemin otomatik olarak aynı rengin soluk hali */
  tone: 'accent' | 'success' | 'warning' | 'error' | 'purple' | 'muted';
  title: string;
  sub: string;
  pill?: { label: string; tone: LedgerRow['tone'] };
  amount: string;
  amountTone?: LedgerRow['tone'];
}

const TONE: Record<LedgerRow['tone'], { fg: string; bg: string }> = {
  accent: { fg: 'var(--color-accent)', bg: 'var(--color-accent-muted)' },
  success: { fg: 'var(--color-success)', bg: 'var(--color-success-muted)' },
  warning: { fg: 'var(--color-warning)', bg: 'var(--color-warning-muted)' },
  error: { fg: 'var(--color-error)', bg: 'var(--color-error-muted)' },
  purple: { fg: 'var(--color-purple)', bg: 'var(--color-purple-muted)' },
  muted: { fg: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)' },
};

export function LedgerList({
  title,
  rows,
  emptyText,
  action,
}: {
  title: string;
  rows: LedgerRow[];
  emptyText: string;
  action?: { href: string; label: string };
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
          {title}
          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--color-text-secondary)]">
            {rows.length}
          </span>
        </h2>
        {action && (
          <Link href={action.href} className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            {action.label}
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-10 text-center text-sm text-[var(--color-text-muted)]">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {rows.map((r) => {
            const Icon = r.icon;
            const t = TONE[r.tone];
            const pill = r.pill ? TONE[r.pill.tone] : null;
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-bg-tertiary)]">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: t.bg, color: t.fg }}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{r.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{r.sub}</p>
                </div>
                {r.pill && pill && (
                  <span className="hidden flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex" style={{ color: pill.fg, background: pill.bg }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: pill.fg }} />
                    {r.pill.label}
                  </span>
                )}
                <span
                  className="w-28 flex-shrink-0 text-right text-sm font-semibold tabular-nums"
                  style={{ color: r.amountTone ? TONE[r.amountTone].fg : 'var(--color-text-primary)' }}
                >
                  {r.amount}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
