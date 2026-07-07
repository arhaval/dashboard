'use client';

import { useState, useTransition } from 'react';
import { Youtube, CheckCircle2, RefreshCw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backfillYouTube } from './youtube-actions';

interface Props {
  connected: boolean;
}

export function YouTubeConnect({ connected }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBackfill() {
    setMsg(null);
    startTransition(async () => {
      const res = await backfillYouTube();
      setMsg(res.error ? `Hata: ${res.error}` : `${res.filled} ay Analytics'ten dolduruldu ✓`);
    });
  }

  return (
    <div
      className="mb-6 rounded-[var(--radius-md)] border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Youtube className="h-5 w-5" style={{ color: '#FF0000' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              YouTube Analytics Bağlantısı
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {connected
                ? 'Bağlı — video/Shorts/canlı izlenme, beğeni ve yorum her ay otomatik ve birebir Studio verisiyle dolar.'
                : 'Kanalını bağla; aylık gerçek performans (o ay içinde) otomatik gelsin.'}
            </p>
          </div>
        </div>

        {connected ? (
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Bağlı
            </span>
            <Button onClick={handleBackfill} size="sm" variant="secondary" disabled={isPending}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              {isPending ? 'Dolduruluyor…' : 'Geçmişi Doldur (son 12 ay)'}
            </Button>
          </div>
        ) : (
          <a href="/api/youtube/oauth/start">
            <Button size="sm">
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Kanalı Bağla
            </Button>
          </a>
        )}
      </div>

      {msg && (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{msg}</p>
      )}
    </div>
  );
}
