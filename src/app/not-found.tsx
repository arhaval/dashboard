/**
 * Global 404 Page
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="mb-4 text-5xl font-bold text-[var(--color-text-muted)]">
          404
        </span>
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
          Sayfa bulunamadı
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link
          href="/"
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-light)]"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
