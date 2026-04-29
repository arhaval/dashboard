'use client';

import * as React from 'react';
import { Download, Share, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePwaInstall } from '@/hooks/use-pwa-install';

export function InstallButton() {
  const { canInstall, isIos, isInstalled, install } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = React.useState(false);

  // Already installed or nothing to show
  if (isInstalled || (!canInstall && !isIos)) return null;

  if (isIos) {
    return (
      <>
        <button
          onClick={() => setShowIosGuide(true)}
          className={cn(
            'flex h-8 items-center gap-2 rounded-[var(--radius-md)] px-3',
            'text-xs font-medium',
            'bg-[var(--color-accent-muted)] text-[var(--color-accent)]',
            'hover:bg-[var(--color-accent)] hover:text-white',
            'transition-colors'
          )}
          aria-label="Uygulamayı kur"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Uygulamayı Kur</span>
        </button>

        {/* iOS guide modal */}
        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowIosGuide(false)}
            />
            <div
              className={cn(
                'relative w-full max-w-sm rounded-[var(--radius-lg)] p-6',
                'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]'
              )}
            >
              <button
                onClick={() => setShowIosGuide(false)}
                className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
                Ana Ekrana Ekle
              </h3>
              <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
                Safari'de uygulamayı ana ekrana eklemek için:
              </p>

              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">1</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Alt ortadaki{' '}
                    <Share className="inline h-4 w-4 text-[var(--color-accent)]" />{' '}
                    <strong className="text-[var(--color-text-primary)]">Paylaş</strong> butonuna dokun
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">2</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    <strong className="text-[var(--color-text-primary)]">Ana Ekrana Ekle</strong>'ye dokun
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">3</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    <strong className="text-[var(--color-text-primary)]">Ekle</strong>'ye dokun
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={install}
      className={cn(
        'flex h-8 items-center gap-2 rounded-[var(--radius-md)] px-3',
        'text-xs font-medium',
        'bg-[var(--color-accent-muted)] text-[var(--color-accent)]',
        'hover:bg-[var(--color-accent)] hover:text-white',
        'transition-colors'
      )}
      aria-label="Uygulamayı kur"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Uygulamayı Kur</span>
    </button>
  );
}
