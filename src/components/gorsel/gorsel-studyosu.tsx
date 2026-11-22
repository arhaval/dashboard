'use client';

/**
 * Görsel Stüdyosu: solda form, sağda canlı önizleme ve indirme.
 * Şimdilik tek şablon (maç günü). Yeni şablon: gorsel/BENIOKU.md.
 */

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GORSEL_CIKTILAR, GORSEL_SABLONLAR } from '@/constants/gorsel';
import { MAC_GUNU_BOS_FORM, macGunuVerisi, type MacGunuForm } from '@/lib/gorsel/mac-gunu';
import { useGorselIndir } from '@/hooks/use-gorsel-indir';
import { MacGunuFormu } from './mac-gunu-formu';
import { SablonOnizleme } from './sablon-onizleme';

const SABLON = 'mac-gunu';

function Uyarilar({ baslik, maddeler, ton }: { baslik: string; maddeler: string[]; ton: 'uyari' | 'hata' }) {
  if (maddeler.length === 0) return null;
  const renk = ton === 'hata' ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]';
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
      <p className={`mb-2 flex items-center gap-2 text-sm font-medium ${renk}`}>
        <AlertTriangle className="h-4 w-4" />
        {baslik}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-text-secondary)]">
        {maddeler.map((m) => <li key={m}>{m}</li>)}
      </ul>
    </div>
  );
}

export function GorselStudyosu() {
  const [form, setForm] = useState<MacGunuForm>(MAC_GUNU_BOS_FORM);
  const [onizlemeUyarilari, setOnizlemeUyarilari] = useState<string[]>([]);
  const donusum = useMemo(() => macGunuVerisi(form), [form]);
  const veri = donusum.ok ? donusum.veri : null;
  const { calisan, hata, uyarilar: sunucuUyarilari, indir } = useGorselIndir(SABLON);

  const degistir = useCallback((d: Partial<MacGunuForm>) => setForm((f) => ({ ...f, ...d })), []);
  const onDenetim = useCallback((u: string[]) => setOnizlemeUyarilari(u), []);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
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
              disabled={!veri || calisan !== null}
              isLoading={calisan === c}
              onClick={() => veri && indir(c, veri)}
            >
              <Download className="mr-2 h-4 w-4" />
              {GORSEL_CIKTILAR[c].etiket}
            </Button>
          ))}
        </div>
        {!donusum.ok && <Uyarilar baslik="Eksik bilgi" maddeler={donusum.hatalar} ton="uyari" />}
        <Uyarilar baslik="Şablon denetimi (bu hâliyle indirilemez)" maddeler={veri ? onizlemeUyarilari : []} ton="uyari" />
        <Uyarilar baslik="Dosya teslim edilmedi" maddeler={sunucuUyarilari} ton="hata" />
        <Uyarilar baslik="Hata" maddeler={hata ? [hata] : []} ton="hata" />
      </div>
    </div>
  );
}
