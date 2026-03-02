'use client';

/**
 * Auth Error Boundary
 * Catches runtime errors in auth routes
 */

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
          Giriş hatası
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Giriş sayfası yüklenirken bir hata oluştu.
        </p>
        <button
          onClick={reset}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-light)]"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
