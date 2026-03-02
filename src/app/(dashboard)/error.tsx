'use client';

/**
 * Dashboard Error Boundary
 * Catches runtime errors in any dashboard route
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
          Bir hata oluştu
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Sayfa yüklenirken beklenmeyen bir hata meydana geldi.
          Lütfen tekrar deneyin.
        </p>
        <Button onClick={reset}>Tekrar Dene</Button>
      </div>
    </div>
  );
}
