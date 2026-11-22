'use client';

/**
 * Şablonun canlı önizlemesi. Sunucunun çizdiği HTML'in aynısı iframe'de açılır,
 * veri postMessage ile gönderilir; şablonun denetim uyarıları geri gelir.
 * Önizlemede görülen, inen dosyanın birebir aynısıdır (zemin dahil).
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { GORSEL_MESAJ, GORSEL_SABLONLAR, type GorselFormat, type GorselSablon } from '@/constants/gorsel';
import type { MacGunuVeri } from '@/lib/validations/gorsel';

const GECIKME_MS = 200;

/** 1080 px genişlikteki sayfa ekrana ölçeklenir: telefonda .3, geniş ekranda .375. */
const BOYUT: Record<GorselFormat, { kutu: string; cerceve: string }> = {
  post: {
    kutu: 'h-[432px] w-[324px] sm:h-[540px] sm:w-[405px]',
    cerceve: 'h-[1440px] w-[1080px] scale-[.3] sm:scale-[.375]',
  },
  hikaye: {
    kutu: 'h-[432px] w-[243px] sm:h-[540px] sm:w-[303.75px]',
    cerceve: 'h-[1920px] w-[1080px] scale-[.225] sm:scale-[.28125]',
  },
};

interface SablonOnizlemeProps {
  sablon: GorselSablon;
  format: GorselFormat;
  veri: MacGunuVeri | null;
  onDenetim: (uyarilar: string[]) => void;
}

export function SablonOnizleme({ sablon, format, veri, onDenetim }: SablonOnizlemeProps) {
  const cerceve = useRef<HTMLIFrameElement>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    const dinle = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== cerceve.current?.contentWindow) return;
      if (e.data?.tip === GORSEL_MESAJ.hazir) setHazir(true);
      if (e.data?.tip === GORSEL_MESAJ.denetim) onDenetim(Array.isArray(e.data.uyarilar) ? e.data.uyarilar : []);
    };
    window.addEventListener('message', dinle);
    return () => window.removeEventListener('message', dinle);
  }, [onDenetim]);

  useEffect(() => {
    if (!hazir || !veri) return;
    const zamanlayici = setTimeout(() => {
      cerceve.current?.contentWindow?.postMessage({ tip: GORSEL_MESAJ.veri, veri }, window.location.origin);
    }, GECIKME_MS);
    return () => clearTimeout(zamanlayici);
  }, [hazir, veri]);

  const boyut = BOYUT[format];
  return (
    <div className={cn('relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)]', boyut.kutu)}>
      <iframe
        ref={cerceve}
        title="Görsel önizlemesi"
        src={`/api/gorsel/varlik/${GORSEL_SABLONLAR[sablon].dosya}?onizleme=1`}
        className={cn('pointer-events-none origin-top-left border-0', boyut.cerceve)}
      />
      {!veri && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
          Önizleme için formu doldur
        </div>
      )}
    </div>
  );
}
