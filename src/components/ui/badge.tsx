import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Durum etiketi.
 *
 * CLAUDE.md'deki bileşen tablosunda bu primitif yazılıydı ama dosyası hiç
 * oluşturulmamıştı; sonuç olarak panelde ~105 tane elle yapılmış etiket var ve
 * her biri birkaç piksel farklı dolguya, farklı yuvarlamaya, farklı yazı
 * ağırlığına sahip. Göz bu küçük tutarsızlıkları tek tek fark etmez ama
 * bütünü "el yapımı" diye okur.
 *
 * Biçim CLAUDE.md'nin kuralı: pill, soluk zemin, KENARLIK YOK.
 */

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
  accent:  'bg-[var(--color-accent-muted)] text-[var(--color-accent)]',
  success: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  error:   'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  info:    'bg-[var(--color-info-muted)] text-[var(--color-info)]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Yoğun listelerde kullanılan daha küçük boy. */
  size?: 'sm' | 'md';
}

export function Badge({
  tone = 'neutral',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        TONE_CLASS[tone],
        className
      )}
      {...props}
    />
  );
}
