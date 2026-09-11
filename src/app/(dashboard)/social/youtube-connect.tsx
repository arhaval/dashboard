'use client';

import { useState, useTransition } from 'react';
import { Youtube, CheckCircle2, RefreshCw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backfillYouTube } from './youtube-actions';
import type { ReconcileResult } from '@/services/youtube-analytics.service';

interface Props {
  connected: boolean;
}

export function YouTubeConnect({ connected }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [reconcile, setReconcile] = useState<ReconcileResult | null>(null);

  function handleBackfill() {
    setMsg(null);
    startTransition(async () => {
      const res = await backfillYouTube();
      setMsg(res.error ? `Hata: ${res.error}` : `${res.filled} ay Analytics'ten dolduruldu ✓`);
      setReconcile(res.reconcile ?? null);
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
      {reconcile && <StudioReconcile data={reconcile} />}
    </div>
  );
}

/**
 * Studio kıyası. Aylık tablo yalnızca video/Shorts/canlıyı saklar; bu kutu
 * Studio'nun toplamıyla aradaki farkı ve farkın kaynağını gösterir.
 */
function StudioReconcile({ data }: { data: ReconcileResult }) {
  const counted = data.byType.video_views + data.byType.shorts_views + data.byType.live_views;
  const n = (v: number) => v.toLocaleString('tr-TR');
  return (
    <div
      className="mt-3 rounded-[var(--radius-md)] border px-3 py-2 text-xs"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
    >
      <p style={{ color: 'var(--color-text-muted)' }}>
        Studio kıyası · son {data.days} gün ({data.start} – {data.end})
      </p>
      <p className="mt-1">
        YouTube toplam görüntülenme:{' '}
        <span className="font-mono font-semibold tabular-nums">{n(data.total)}</span>
      </p>
      <p>
        Video {n(data.byType.video_views)} · Shorts {n(data.byType.shorts_views)} · Canlı{' '}
        {n(data.byType.live_views)} ={' '}
        <span className="font-mono tabular-nums">{n(counted)}</span>
      </p>
      <p>
        Diğer türler (gönderi, hikâye, sınıflandırılmamış):{' '}
        <span className="font-mono tabular-nums">{n(data.byType.other_views)}</span>
      </p>
    </div>
  );
}
