'use client';

/**
 * Prominent "install the app" card for the profile page. Renders only when the
 * app can actually be installed (Android/desktop prompt, or iOS Safari where we
 * show the Add-to-Home-Screen guide). Hidden once installed.
 */

import { Smartphone } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { InstallButton } from './install-button';

export function InstallCard() {
  const { canInstall, isIos, isInstalled } = usePwaInstall();

  if (isInstalled || (!canInstall && !isIos)) return null;

  return (
    <div
      className="mt-6 flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border p-4"
      style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted)' }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <Smartphone className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
      </div>

      <div className="min-w-[12rem] flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Arhaval&apos;i uygulama olarak kur
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Ana ekranından tek dokunuşla aç, işlerin ve bildirimlerin anında düşsün.
        </p>
      </div>

      <InstallButton fullLabel />
    </div>
  );
}
