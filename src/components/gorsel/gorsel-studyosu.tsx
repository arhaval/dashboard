'use client';

/**
 * Görsel Stüdyosu: yaklaşan maçlardan paylaşılacak olanı SEÇ → form kendiliğinden dolar →
 * önizlemede kontrol et → indir. Form elle de doldurulabilir.
 * Şimdilik tek şablon (maç günü). Yeni şablon: gorsel/BENIOKU.md.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GORSEL_CIKTILAR, GORSEL_SABLONLAR, GORSEL_TAKIMLAR, type GorselCikti } from '@/constants/gorsel';
import type { GorselMacOzeti } from '@/lib/gorsel/arhaval-mac';
import { MAC_GUNU_BOS_FORM, macGunuVerisi, type MacGunuForm } from '@/lib/gorsel/mac-gunu';
import { useGorselIndir } from '@/hooks/use-gorsel-indir';
import { MacGunuFormu } from './mac-gunu-formu';
import { SablonOnizleme } from './sablon-onizleme';
import { YaklasanMaclar } from './yaklasan-maclar';

const SABLON = 'mac-gunu';
type Ton = 'bilgi' | 'uyari' | 'hata';
const TON: Record<Ton, string> = {
  bilgi: 'text-[var(--color-info)]',
  uyari: 'text-[var(--color-warning)]',
  hata: 'text-[var(--color-error)]',
};

function Liste({ baslik, maddeler, ton }: { baslik: string; maddeler: string[]; ton: Ton }) {
  if (maddeler.length === 0) return null;
  const Ikon = ton === 'bilgi' ? Info : AlertTriangle;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
      <p className={`mb-2 flex items-center gap-2 text-sm font-medium ${TON[ton]}`}>
        <Ikon className="h-4 w-4" />
        {baslik}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-text-secondary)]">
        {maddeler.map((m) => <li key={m}>{m}</li>)}
      </ul>
    </div>
  );
}

interface GorselStudyosuProps {
  maclar: GorselMacOzeti[];
  maclarHatasi: string | null;
}

export function GorselStudyosu({ maclar, maclarHatasi }: GorselStudyosuProps) {
  const [form, setForm] = useState<MacGunuForm>(MAC_GUNU_BOS_FORM);
  const [seciliMac, setSeciliMac] = useState<string | null>(null);
  const [secimNotlari, setSecimNotlari] = useState<string[]>([]);
  const [denetim, setDenetim] = useState<{ uyarilar: string[]; notlar: string[] }>({ uyarilar: [], notlar: [] });
  const onizleme = useRef<HTMLDivElement>(null);
  const donusum = useMemo(() => macGunuVerisi(form), [form]);
  const veri = donusum.ok ? donusum.veri : null;
  const { calisan, hata, uyarilar: sunucuUyarilari, indir } = useGorselIndir(SABLON);
  // HD çıktı fotoğrafların HD boyda olmasını ister; şablon büyütmeyi zaten reddeder, düğme baştan kapalı.
  const hdYok = GORSEL_TAKIMLAR[form.takim]?.hdFoto === false;
  const kapali = (c: GorselCikti) => c === 'post-hd' && hdYok;

  const degistir = useCallback((d: Partial<MacGunuForm>) => setForm((f) => ({ ...f, ...d })), []);
  const onDenetim = useCallback((uyarilar: string[], notlar: string[]) => setDenetim({ uyarilar, notlar }), []);
  const macSec = useCallback((id: string, yeni: MacGunuForm, notlar: string[]) => {
    setSeciliMac(id);
    setSecimNotlari(notlar);
    setForm((f) => ({ ...yeni, format: f.format }));
    onizleme.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Yaklaşan maçlar</CardTitle>
        </CardHeader>
        <CardContent>
          <YaklasanMaclar maclar={maclar} hata={maclarHatasi} seciliId={seciliMac} onSec={macSec} />
        </CardContent>
      </Card>

      <div ref={onizleme} className="grid scroll-mt-6 gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        <Card>
          <CardHeader>
            <CardTitle>{GORSEL_SABLONLAR[SABLON].ad}</CardTitle>
          </CardHeader>
          <CardContent>
            <MacGunuFormu form={form} onChange={degistir} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <SablonOnizleme sablon={SABLON} format={form.format} veri={veri} onDenetim={onDenetim} />
          <div className="flex flex-wrap gap-2">
            {GORSEL_SABLONLAR[SABLON].ciktilar.map((c, i) => (
              <Button
                key={c}
                size="sm"
                variant={i === 0 ? 'default' : 'secondary'}
                disabled={!veri || calisan !== null || kapali(c)}
                title={kapali(c) ? 'Bu takımın fotoğrafları HD için yeterli değil' : undefined}
                isLoading={calisan === c}
                onClick={() => veri && indir(c, veri)}
              >
                <Download className="mr-2 h-4 w-4" />
                {GORSEL_CIKTILAR[c].etiket}
              </Button>
            ))}
          </div>
          {!donusum.ok && <Liste baslik="Eksik bilgi" maddeler={donusum.hatalar} ton="uyari" />}
          <Liste baslik="Paylaşmadan önce kontrol et" maddeler={[...secimNotlari, ...(veri ? denetim.notlar : [])]} ton="bilgi" />
          <Liste baslik="Şablon denetimi (bu hâliyle indirilemez)" maddeler={veri ? denetim.uyarilar : []} ton="uyari" />
          <Liste baslik="Dosya teslim edilmedi" maddeler={sunucuUyarilari} ton="hata" />
          <Liste baslik="Hata" maddeler={hata ? [hata] : []} ton="hata" />
        </div>
      </div>
    </div>
  );
}
