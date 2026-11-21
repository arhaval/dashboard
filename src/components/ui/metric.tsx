import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tek bir sayı: soluk etiket, büyük monospace değer, altında ipucu.
 *
 * Neden ikonsuz ve renksiz: ana sayfada sekiz adet renkli-ikonlu kutu yan yana
 * duruyordu. Hepsi aynı görsel ağırlıkta bağırınca hiçbiri öne çıkmıyor ve göz
 * nereye bakacağını bilemiyor. Beğenilen panellerin yaptığı şey bunun tersi:
 * sayılar sessiz ve aynı, renk YALNIZCA bir sorun varsa görünür.
 *
 * Bu yüzden `tone` varsayılan olarak nötr; dikkat çekmesi gereken tek sayıya
 * (ödenmemiş tutar, zararlı ay) elle veriliyor.
 *
 * Monospace rakam CLAUDE.md'nin kuralı: sayılar alt alta hizalı okunsun.
 */

export type MetricTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

const VALUE_COLOR: Record<MetricTone, string> = {
  neutral: 'text-[var(--color-text-primary)]',
  accent:  'text-[var(--color-accent)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  error:   'text-[var(--color-error)]',
};

export function Metric({
  label,
  value,
  hint,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: string;
  /** Altındaki tek satırlık bağlam — "geçen ay: 12", "3 iş bekliyor". */
  hint?: string;
  tone?: MetricTone;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className={cn('text-mono mt-1.5 text-2xl font-semibold tabular-nums', VALUE_COLOR[tone])}>
        {value}
      </p>
      {hint && (
        <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
    </div>
  );
}

/**
 * Sayı grubu: tek bir yüzey, aralarında saç teli kalınlığında bölücü.
 *
 * Dört ayrı kutu yerine tek panel: kutular arası boşluk ve dört kenarlık
 * kalabalık üretiyordu. Aynı aileden sayılar bir arada dursun.
 */
export function MetricRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'grid rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
        // Tek kolondan doğrudan dört kolona geçiyor. Araya iki kolonlu bir
        // kırılım koymak bölücüleri yanlış yere çiziyordu: ikinci satırın ilk
        // hücresi de dikey çizgi alıyor, panelin ortasında kopuk bir çizgi
        // oluşuyordu. Tek kolonda yatay, dört kolonda dikey — ikisi de doğru.
        '[&>*]:px-4 [&>*]:py-3.5',
        'divide-y divide-[var(--color-border)]',
        'lg:grid-cols-4 lg:divide-x lg:divide-y-0'
      )}
    >
      {children}
    </div>
  );
}
