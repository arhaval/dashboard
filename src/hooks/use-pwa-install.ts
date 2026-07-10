'use client';

import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallState {
  canInstall: boolean;
  isIos: boolean;
  isInstalled: boolean;
  install: () => Promise<void>;
}

export function usePwaInstall(): PwaInstallState {
  const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  // Detected on the client only — computing this during render would differ
  // from the server-rendered output and cause a hydration mismatch.
  const [isIos, setIsIos] = React.useState(false);

  React.useEffect(() => {
    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
        !(window.navigator as { standalone?: boolean }).standalone
    );

    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setPromptEvent(null);
    }
  }, [promptEvent]);

  return {
    canInstall: !!promptEvent,
    isIos,
    isInstalled,
    install,
  };
}
