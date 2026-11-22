'use client';

/**
 * Maç günü postu formu. Değerleri doğrulamaz; doğrulama lib/gorsel/mac-gunu.ts
 * ve sunucudaki şemada tek yerde yapılır.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { GORSEL_RAKIPLER, GORSEL_TAKIMLAR } from '@/constants/gorsel';
import { RAKIP_YUKLE, type MacGunuForm } from '@/lib/gorsel/mac-gunu';

const LOGO_TURLERI = ['image/png', 'image/svg+xml', 'image/webp'];
const LOGO_AZAMI_BAYT = 2 * 1024 * 1024;

interface MacGunuFormuProps {
  form: MacGunuForm;
  onChange: (degisiklik: Partial<MacGunuForm>) => void;
}

function Alan({ id, etiket, ipucu, children }: { id: string; etiket: string; ipucu?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} required>{etiket}</Label>
      {children}
      {ipucu && <p className="text-xs text-[var(--color-text-muted)]">{ipucu}</p>}
    </div>
  );
}

export function MacGunuFormu({ form, onChange }: MacGunuFormuProps) {
  const [logoHatasi, setLogoHatasi] = useState<string | null>(null);

  const logoSec = (dosya: File | undefined) => {
    setLogoHatasi(null);
    if (!dosya) return;
    if (!LOGO_TURLERI.includes(dosya.type)) { setLogoHatasi('Logo PNG, SVG ya da WebP olmalı.'); return; }
    if (dosya.size > LOGO_AZAMI_BAYT) { setLogoHatasi('Logo dosyası en fazla 2 MB olabilir.'); return; }
    const okuyucu = new FileReader();
    okuyucu.onload = () => onChange({ rakipLogo: typeof okuyucu.result === 'string' ? okuyucu.result : null });
    okuyucu.onerror = () => setLogoHatasi('Dosya okunamadı.');
    okuyucu.readAsDataURL(dosya);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Alan id="takim" etiket="Takım">
        <Select id="takim" value={form.takim} onChange={(e) => onChange({ takim: e.target.value })}>
          {Object.entries(GORSEL_TAKIMLAR).map(([k, t]) => <option key={k} value={k}>{t.ad}</option>)}
        </Select>
      </Alan>
      <Alan id="rakip" etiket="Rakip">
        <Select id="rakip" value={form.rakip} onChange={(e) => onChange({ rakip: e.target.value })}>
          {Object.entries(GORSEL_RAKIPLER).map(([k, t]) => <option key={k} value={k}>{t.ad}</option>)}
          <option value={RAKIP_YUKLE}>Listede yok, logo yükle</option>
        </Select>
      </Alan>

      {form.rakip === RAKIP_YUKLE && (
        <>
          <Alan id="rakipAd" etiket="Rakip adı" ipucu="Yalnızca dosya adında kullanılır, postta yazmaz.">
            <Input id="rakipAd" value={form.rakipAd} maxLength={40} onChange={(e) => onChange({ rakipAd: e.target.value })} />
          </Alan>
          <Alan id="rakipLogo" etiket="Rakip logosu" ipucu="Şeffaf zeminli PNG ya da SVG. Şablon beyaza çevirir ve boyutunu diğer logoya eşitler.">
            <Input id="rakipLogo" type="file" accept={LOGO_TURLERI.join(',')} error={Boolean(logoHatasi)} onChange={(e) => logoSec(e.target.files?.[0])} />
            {logoHatasi && <p className="text-xs text-[var(--color-error)]">{logoHatasi}</p>}
          </Alan>
        </>
      )}

      <div className="sm:col-span-2">
        <Alan id="turnuva" etiket="Turnuva satırı" ipucu="Postta yazdığın gibi çıkar. Büyük harf kuralını sen uygula (ör. SINGAPUR MAJOR, YARI FİNAL).">
          <Input id="turnuva" value={form.turnuva} maxLength={48} placeholder="RUSH BRNO 2026 · YARI FİNAL" onChange={(e) => onChange({ turnuva: e.target.value })} />
        </Alan>
      </div>
      <Alan id="saat" etiket="Saat">
        <Input id="saat" value={form.saat} maxLength={5} placeholder="19.00" inputMode="numeric" onChange={(e) => onChange({ saat: e.target.value })} />
      </Alan>
      <Alan id="yayin" etiket="Yayın" ipucu="Maçı Arhaval yayınlamıyorsa yayın satırı hiç konmaz.">
        <Select id="yayin" value={form.yayin ? 'var' : 'yok'} onChange={(e) => onChange({ yayin: e.target.value === 'var' })}>
          <option value="var">Arhaval yayınlıyor (YouTube + Kick)</option>
          <option value="yok">Yayın yok</option>
        </Select>
      </Alan>
      <Alan id="format" etiket="Önizleme">
        <Select id="format" value={form.format} onChange={(e) => onChange({ format: e.target.value === 'hikaye' ? 'hikaye' : 'post' })}>
          <option value="post">Post (3:4)</option>
          <option value="hikaye">Hikâye (9:16)</option>
        </Select>
      </Alan>
    </div>
  );
}
