import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageHref, type Paged } from '@/lib/paginate';

/**
 * Tablo altındaki sayfa denetimi. Sunucu bileşeni: bağlantı olduğu için
 * istemci koduna ihtiyaç yok, geri tuşu ve bağlantı paylaşımı çalışır.
 *
 * Tek sayfa varsa hiç basılmaz — tek sayfalık listenin altında "1 / 1" yazmak
 * bilgi değil gürültü.
 */
export function Pager({
  paged,
  basePath,
  params,
  label = 'kayıt',
}: {
  paged: Paged<unknown>;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  /** Sayının yanına yazılacak ad: "kayıt", "iş", "ödeme"… */
  label?: string;
}) {
  if (paged.totalPages <= 1) return null;

  const prevDisabled = paged.page === 1;
  const nextDisabled = paged.page === paged.totalPages;

  const buttonClass =
    'flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]';
  const disabledClass = 'pointer-events-none opacity-40';

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">
        {paged.total} {label}tan {paged.from}–{paged.to} arası
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={pageHref(basePath, params, paged.page - 1)}
          aria-disabled={prevDisabled}
          className={prevDisabled ? `${buttonClass} ${disabledClass}` : buttonClass}
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <span className="min-w-[60px] text-center text-sm text-[var(--color-text-secondary)]">
          {paged.page} / {paged.totalPages}
        </span>

        <Link
          href={pageHref(basePath, params, paged.page + 1)}
          aria-disabled={nextDisabled}
          className={nextDisabled ? `${buttonClass} ${disabledClass}` : buttonClass}
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
