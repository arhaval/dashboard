'use client';

/**
 * Yaklaşan maçlar (arhaval.com, HLTV; tarayıcıda okunur). Her maç paylaşılmaz: ekip
 * paylaşacağı maçı seçer, "Postu hazırla" formu kendiliğinden doldurur.
 */

import { useState, useTransition } from 'react';
import { CalendarClock, Loader2, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { gunEtiketi, type GorselMacOzeti } from '@/lib/gorsel/arhaval-mac';
import type { MacGunuForm } from '@/lib/gorsel/mac-gunu';
import type { GorselMacFormSonucu } from '@/services/gorsel-mac.service';

type Hazirla = (id: string) => Promise<GorselMacFormSonucu>;

interface YaklasanMaclarProps {
  maclar: GorselMacOzeti[];
  yukleniyor: boolean;
  hata: string | null;
  hazirla: Hazirla;
  seciliId: string | null;
  onSec: (id: string, form: MacGunuForm, notlar: string[]) => void;
}

function Satir({ mac, secili, hazirla, onSec }: { mac: GorselMacOzeti; secili: boolean; hazirla: Hazirla; onSec: YaklasanMaclarProps['onSec'] }) {
  const [bekliyor, baslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const hazirlanamaz = mac.engeller.length > 0;

  const postuHazirla = () => baslat(async () => {
    setHata(null);
    const sonuc = await hazirla(mac.id);
    if (sonuc.ok) onSec(mac.id, sonuc.form, sonuc.notlar);
    else setHata(sonuc.hata);
  });

  return (
    <li className="flex flex-col gap-3 border-b border-[var(--color-border)] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="w-20 shrink-0 text-sm">
          <p className="text-[var(--color-text-muted)]">{mac.baslangic ? gunEtiketi(mac.baslangic) : 'Tarih yok'}</p>
          <p className="font-mono text-[var(--color-text-primary)]">{mac.saat ?? '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--color-text-primary)]">{mac.takimAd} – {mac.rakipAd}</p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{mac.turnuvaSatiri || 'Turnuva bilgisi yok'}</p>
          {(hazirlanamaz || hata) && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{hata ?? mac.engeller.join(' · ')}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {secili && <Badge tone="accent">Formda</Badge>}
        {!hazirlanamaz && mac.notlar.length > 0 && <Badge tone="warning">{mac.notlar.length} kontrol</Badge>}
        <Button size="sm" variant={secili ? 'secondary' : 'default'} disabled={hazirlanamaz} isLoading={bekliyor} onClick={postuHazirla}>
          <Wand2 className="mr-2 h-4 w-4" />
          Postu hazırla
        </Button>
      </div>
    </li>
  );
}

export function YaklasanMaclar({ maclar, yukleniyor, hata, hazirla, seciliId, onSec }: YaklasanMaclarProps) {
  if (yukleniyor) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Maçlar arhaval.com&apos;dan alınıyor…
      </p>
    );
  }
  if (hata) {
    return <p className="text-sm text-[var(--color-error)]">{hata}. Formu elle doldurabilirsin.</p>;
  }
  if (maclar.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <CalendarClock className="h-4 w-4" />
        Önümüzdeki 3 günde Türk takımlarının maçı görünmüyor.
      </p>
    );
  }
  return (
    <ul>
      {maclar.map((m) => <Satir key={m.id} mac={m} secili={m.id === seciliId} hazirla={hazirla} onSec={onSec} />)}
    </ul>
  );
}
