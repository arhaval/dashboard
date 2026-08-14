'use client';

/**
 * Ay seçici: `‹ Temmuz 2026 ›`
 *
 * Seçim URL'de (?month=YYYY-MM) tutulur: sekmeler arasında korunur,
 * paylaşılan link doğru ayı açar, geri tuşu çalışır.
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel } from './social-monthly.constants';
import { selectableMonths } from './month.utils';

export function MonthPicker({ month, available }: { month: string; available: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Kesintisiz aralık: hiç veri girilmemiş bir ay da seçilebilsin.
  const months = [...new Set([...selectableMonths(available), month])].sort();
  const index = months.indexOf(month);
  const older = index > 0 ? months[index - 1] : null;
  const newer = index >= 0 && index < months.length - 1 ? months[index + 1] : null;

  function go(target: string | null) {
    if (!target) return;
    const next = new URLSearchParams(params.toString());
    next.set('month', target);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-[var(--radius-md)] p-0.5"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <Arrow onClick={() => go(older)} disabled={!older} label="Önceki ay">
        <ChevronLeft className="h-4 w-4" />
      </Arrow>

      {/*
        Oklara ek olarak doğrudan seçim: adım adım gitmek uzun listede yoruyor
        ve bir ay atlanamadığında sıkışma hissi veriyordu. Seçim listesi her
        zaman bütün ayları gösterir.
      */}
      <select
        value={month}
        onChange={(e) => go(e.target.value)}
        aria-label="Ay seç"
        className="cursor-pointer rounded-[var(--radius-sm)] px-1 py-0.5 text-center text-[12.5px] font-semibold outline-none"
        style={{ backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: 'none', minWidth: '7.5rem' }}
      >
        {[...months].reverse().map((m) => (
          <option key={m} value={m} style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            {monthLabel(m)}
          </option>
        ))}
      </select>

      <Arrow onClick={() => go(newer)} disabled={!newer} label="Sonraki ay">
        <ChevronRight className="h-4 w-4" />
      </Arrow>
    </div>
  );
}

function Arrow({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-[var(--radius-sm)] p-1 transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {children}
    </button>
  );
}
