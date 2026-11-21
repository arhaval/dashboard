import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bölüm başlığı.
 *
 * Panelde iki ayrı başlık deseni yan yana yaşıyordu: sayfa ortasında elle
 * yazılmış `<p class="uppercase tracking-widest">` kopyaları ve kart içinde
 * CardTitle. Aynı sayfada iki farklı başlık dili olunca bölümler birbirinin
 * devamı gibi okunmuyor.
 *
 * Tek desen: soluk küçük büyük-harf etiket, sağda isteğe bağlı bağlantı.
 */
export function SectionHeader({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  /** Başlığın yanında duran ikincil bilgi — ay adı, tarih aralığı. */
  hint?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-baseline justify-between gap-4', className)}>
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        {title}
        {hint && (
          <span className="ml-2 font-normal normal-case tracking-normal text-[var(--color-text-muted)]">
            {hint}
          </span>
        )}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="flex shrink-0 items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
        >
          {action.label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/**
 * Bölüm: başlık + içerik, aralarında sabit boşluk.
 *
 * Dikey ritim burada tek yerden geliyor. Eskiden her bölüm kendi `mt-6`
 * ya da `mt-8`ini yazıyordu; aralar 24 ile 32 piksel arasında geziniyordu ve
 * sayfa düzensiz hissettiriyordu.
 */
export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 last:mb-0">
      <SectionHeader title={title} hint={hint} action={action} />
      {children}
    </section>
  );
}
