'use client';

/**
 * Social Media Sync Buttons
 * Triggers API sync for Twitch and YouTube
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface SyncResult {
  platform: string;
  status: SyncStatus;
  message?: string;
}

export function SyncButtons() {
  const router = useRouter();
  const [twitchStatus, setTwitchStatus] = useState<SyncStatus>('idle');
  const [youtubeStatus, setYoutubeStatus] = useState<SyncStatus>('idle');
  const [feedback, setFeedback] = useState<SyncResult | null>(null);

  const syncPlatform = async (
    platform: 'twitch' | 'youtube',
    setStatus: (s: SyncStatus) => void
  ) => {
    setStatus('loading');
    setFeedback(null);

    try {
      const res = await fetch(`/api/social-metrics/sync/${platform}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setFeedback({
          platform,
          status: 'error',
          message: data.error || 'Senkronizasyon başarısız',
        });
        return;
      }

      setStatus('success');
      setFeedback({
        platform,
        status: 'success',
        message: platform === 'twitch'
          ? `Twitch senkronize edildi${data.synced?.isLive ? ` (Canlı: ${data.synced.viewerCount} izleyici)` : ''}`
          : `YouTube senkronize edildi (${data.synced?.subscriberCount?.toLocaleString('tr-TR')} abone)`,
      });

      router.refresh();

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setFeedback(null);
      }, 3000);
    } catch {
      setStatus('error');
      setFeedback({
        platform,
        status: 'error',
        message: 'Bağlantı hatası',
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncPlatform('twitch', setTwitchStatus)}
          disabled={twitchStatus === 'loading'}
        >
          <RefreshCw
            className={cn(
              'mr-1.5 h-3.5 w-3.5',
              twitchStatus === 'loading' && 'animate-spin'
            )}
          />
          Twitch Sync
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => syncPlatform('youtube', setYoutubeStatus)}
          disabled={youtubeStatus === 'loading'}
        >
          <RefreshCw
            className={cn(
              'mr-1.5 h-3.5 w-3.5',
              youtubeStatus === 'loading' && 'animate-spin'
            )}
          />
          YouTube Sync
        </Button>
      </div>

      {feedback && (
        <p
          className={cn(
            'text-xs',
            feedback.status === 'success'
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-error)]'
          )}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
