'use client';

/**
 * Görsel Stüdyosu: sunucuda çizdirip PNG'yi indirir.
 * Şablon denetimi uyarı verirse (422) dosya inmez, uyarılar döner.
 */

import { useCallback, useState } from 'react';
import type { GorselCikti, GorselSablon } from '@/constants/gorsel';
import type { MacGunuVeri } from '@/lib/validations/gorsel';

interface IndirDurumu {
  calisan: GorselCikti | null;
  hata: string | null;
  uyarilar: string[];
}

function dosyaAdiniOku(baslik: string | null, yedek: string): string {
  const m = baslik?.match(/filename="([^"]+)"/);
  return m ? m[1] : yedek;
}

/** Sunucunun hata mesajı; JSON değilse (ör. Vercel'in zaman aşımı/bellek sayfası) kodu ve ilk satırı. */
async function hataMesaji(yanit: Response): Promise<string> {
  const metin = await yanit.text().catch(() => '');
  try {
    const govde = JSON.parse(metin) as { error?: unknown };
    if (typeof govde.error === 'string') return govde.error;
  } catch {
    // JSON değil
  }
  const ozet = metin.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  return `Görsel üretilemedi (HTTP ${yanit.status}${ozet ? `: ${ozet}` : ''}).`;
}

function indirt(blob: Blob, ad: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useGorselIndir(sablon: GorselSablon) {
  const [durum, setDurum] = useState<IndirDurumu>({ calisan: null, hata: null, uyarilar: [] });

  const indir = useCallback(async (cikti: GorselCikti, veri: MacGunuVeri) => {
    setDurum({ calisan: cikti, hata: null, uyarilar: [] });
    try {
      const yanit = await fetch('/api/gorsel/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sablon, cikti, veri }),
      });
      if (yanit.status === 422) {
        const { uyarilar } = (await yanit.json()) as { uyarilar: string[] };
        setDurum({ calisan: null, hata: null, uyarilar });
        return;
      }
      if (!yanit.ok) {
        setDurum({ calisan: null, hata: await hataMesaji(yanit), uyarilar: [] });
        return;
      }
      indirt(await yanit.blob(), dosyaAdiniOku(yanit.headers.get('Content-Disposition'), `${sablon}-${cikti}.png`));
      setDurum({ calisan: null, hata: null, uyarilar: [] });
    } catch {
      setDurum({ calisan: null, hata: 'Sunucuya ulaşılamadı, bağlantını kontrol et.', uyarilar: [] });
    }
  }, [sablon]);

  return { ...durum, indir };
}
