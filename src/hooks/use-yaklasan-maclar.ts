'use client';

/**
 * Görsel Stüdyosu: arhaval.com'dan yaklaşan maçlar (tarayıcıdan okunur, bkz.
 * services/gorsel-mac.service.ts) ve seçilen maçın formunu hazırlama.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { macOzeti, type ArhavalMac, type GorselMacOzeti } from '@/lib/gorsel/arhaval-mac';
import { gorselMacService, type GorselMacFormSonucu } from '@/services/gorsel-mac.service';

type Durum =
  | { tur: 'yukleniyor' }
  | { tur: 'hazir'; maclar: ArhavalMac[] }
  | { tur: 'hata'; hata: string };

export function useYaklasanMaclar() {
  const [durum, setDurum] = useState<Durum>({ tur: 'yukleniyor' });

  useEffect(() => {
    let iptal = false;
    gorselMacService
      .yaklasanlar()
      .then((maclar) => { if (!iptal) setDurum({ tur: 'hazir', maclar }); })
      .catch((e: unknown) => {
        if (iptal) return;
        const hata = e instanceof Error && e.name !== 'ZodError' ? e.message : 'arhaval.com maç listesi okunamadı';
        setDurum({ tur: 'hata', hata });
      });
    return () => { iptal = true; };
  }, []);

  const ozetler: GorselMacOzeti[] = useMemo(() => (durum.tur === 'hazir' ? durum.maclar.map(macOzeti) : []), [durum]);

  const hazirla = useCallback(async (id: string): Promise<GorselMacFormSonucu> => {
    const mac = durum.tur === 'hazir' ? durum.maclar.find((m) => m.id === id) : undefined;
    if (!mac) return { ok: false, hata: 'Maç listede bulunamadı, sayfayı yenile.' };
    return gorselMacService.form(mac);
  }, [durum]);

  return {
    yukleniyor: durum.tur === 'yukleniyor',
    hata: durum.tur === 'hata' ? durum.hata : null,
    maclar: ozetler,
    hazirla,
  };
}
