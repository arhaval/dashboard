'use client';

/**
 * "Taslakların ücretini yeniden hesapla" — fiyat girildikten/değiştikten sonra
 * bekleyen taslak işleri tek tıkla güncel fiyattan fiyatlar. Onaylı/ödenmiş
 * işlere dokunmaz. Sonucu (kaç güncellendi, kaçı çözülemedi) satır içinde söyler.
 */

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { repriceDraftsAction } from './actions';

export function RepriceButton() {
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      const res = await repriceDraftsAction();
      if (!res.success) {
        setResult(res.error ?? 'Hesaplanamadı.');
        return;
      }
      const parts = [`${res.updated ?? 0} taslak güncellendi`];
      if (res.unresolved) parts.push(`${res.unresolved} taslak hâlâ ücretsiz (firma/harita sayısı ya da fiyat eksik) — elle ücret gir`);
      setResult(parts.join(' · '));
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={run} isLoading={pending} disabled={pending}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Taslakların ücretini yeniden hesapla
      </Button>
      {result && <span className="text-xs text-[var(--color-text-secondary)]">{result}</span>}
    </div>
  );
}
