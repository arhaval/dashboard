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
        const govde = (await yanit.json().catch(() => ({}))) as { error?: unknown };
        const mesaj = typeof govde.error === 'string' ? govde.error : 'Görsel üretilemedi, tekrar dene.';
        setDurum({ calisan: null, hata: mesaj, uyarilar: [] });
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
