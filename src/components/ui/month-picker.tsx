'use client';

/**
 * Ay seçici — URL'deki `param` (varsayılan `ay`) değerini YYYY-MM olarak
 * yazar; diğer arama parametrelerini korur, sayfa numarasını sıfırlar.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface MonthPickerProps {
  month: string;
  param?: string;
  label?: string;
}

export function MonthPicker({ month, param = 'ay', label = 'Ay' }: MonthPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <input
        type="month"
        value={month}
        onChange={(e) => {
          const v = e.target.value;
          if (!/^\d{4}-\d{2}$/.test(v)) return;
          const params = new URLSearchParams(searchParams.toString());
          params.set(param, v);
          params.delete('sayfa');
          router.push(`${pathname}?${params.toString()}`);
        }}
        className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      />
    </label>
  );
}
