'use client';

import { useState, useTransition } from 'react';
import { Instagram, CheckCircle2, RefreshCw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backfillInstagram } from './instagram-actions';

interface Props {
  connected: boolean;
  username?: string | null;
}

export function InstagramConnect({ connected, username }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBackfill() {
    setMsg(null);
    startTransition(async () => {
      const res = await backfillInstagram();
      setMsg(res.error ? `Hata: ${res.error}` : `${res.filled} ay dolduruldu ✓`);
    });
  }

  return (
    <div
      className="mb-6 rounded-[var(--radius-md)] border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)' }}
          >
            <Instagram className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Instagram Bağlantısı
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {connected
                ? `Bağlı${username ? ` — @${username}` : ''} — takipçi, izlenme, beğeni, yorum, kaydetme her ay otomatik.`
                : 'Hesabını bağla; takipçi + aylık etkileşim otomatik gelsin.'}
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
          <a href="/api/instagram/oauth/start">
            <Button size="sm">
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Hesabı Bağla
            </Button>
          </a>
        )}
      </div>

      {msg && <p className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{msg}</p>}
    </div>
  );
}
