'use client';

import * as React from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function NotificationButton() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  const [tooltip, setTooltip] = React.useState(false);

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const label = isSubscribed
    ? 'Bildirimleri kapat'
    : permission === 'denied'
      ? 'Bildirimler engellendi'
      : 'Bildirimleri aç';

  const Icon = isLoading
    ? Loader2
    : isSubscribed
      ? BellRing
      : permission === 'denied'
        ? BellOff
        : Bell;

  return (
    <div className="relative" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <button
        onClick={handleClick}
        disabled={isLoading || permission === 'denied'}
        aria-label={label}
        className={cn(
          'flex h-8 w-8 items-center justify-center',
          'rounded-[var(--radius-md)]',
          'transition-colors',
          'hover:bg-[var(--color-bg-tertiary)]',
          isSubscribed && 'text-[var(--color-accent)]',
          !isSubscribed && permission !== 'denied' && 'text-[var(--color-text-muted)]',
          permission === 'denied' && 'cursor-not-allowed opacity-40 text-[var(--color-text-muted)]',
          isLoading && 'cursor-wait'
        )}
      >
        <Icon className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      </button>

      {tooltip && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'whitespace-nowrap rounded-[var(--radius-sm)] px-2 py-1',
            'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]',
            'text-xs text-[var(--color-text-secondary)]',
            'pointer-events-none'
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}
