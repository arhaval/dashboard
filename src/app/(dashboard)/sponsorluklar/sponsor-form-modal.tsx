'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createSponsor, updateSponsor } from './actions';
import type { Sponsor, SponsorStatus, PaymentType } from './sponsor.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  sponsor?: Sponsor | null;
}

const STATUSES: { value: SponsorStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'NEGOTIATING', label: 'Görüşülüyor' },
  { value: 'ENDED', label: 'Bitti' },
];

export function SponsorFormModal({ open, onClose, sponsor }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [paymentType, setPaymentType] = useState<PaymentType>(sponsor?.payment_type ?? 'LUMP');

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = sponsor ? await updateSponsor(sponsor.id, fd) : await createSponsor(fd);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  const labelCls = 'mb-1 block text-xs font-medium';
  const labelStyle = { color: 'var(--color-text-muted)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPending && onClose()} />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)]"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: '0 20px 60px rgba(11,20,55,0.25)' }}
      >
        <div className="flex-shrink-0 border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {sponsor ? 'Sponsoru Düzenle' : 'Yeni Sponsor'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className={labelCls} style={labelStyle}>Sponsor Adı <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <Input name="name" defaultValue={sponsor?.name ?? ''} placeholder="örn. TitanSeat" required />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>Logo {sponsor?.logo_path ? '(yeni seçilirse değişir)' : ''}</label>
              <input name="logo" type="file" accept="image/*"
                className="w-full text-xs" style={{ color: 'var(--color-text-secondary)' }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>Durum</label>
                <Select name="status" defaultValue={sponsor?.status ?? 'ACTIVE'}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Toplam Bedel (₺)</label>
                <Input name="deal_value" type="number" step="0.01" min="0" defaultValue={sponsor?.deal_value ?? ''} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>Ödeme Tipi</label>
                <Select name="payment_type" value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
                  <option value="LUMP">Tek Seferlik</option>
                  <option value="MONTHLY">Aylık Ödeme</option>
                </Select>
              </div>
              {paymentType === 'MONTHLY' && (
                <div>
                  <label className={labelCls} style={labelStyle}>Aylık Tutar (₺)</label>
                  <Input name="monthly_amount" type="number" step="0.01" min="0" defaultValue={sponsor?.monthly_amount ?? ''} placeholder="0" />
                </div>
              )}
            </div>
            {paymentType === 'MONTHLY' && (
              <p className="-mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Kaydettikten sonra sponsor detayında, başlangıç–bitiş aralığına göre aylık ödeme planı oluşturabilirsiniz.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>Başlangıç</label>
                <Input name="start_date" type="date" defaultValue={sponsor?.start_date ?? ''} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Bitiş</label>
                <Input name="end_date" type="date" defaultValue={sponsor?.end_date ?? ''} />
              </div>
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>İletişim</label>
              <Input name="contact" defaultValue={sponsor?.contact ?? ''} placeholder="Yetkili / e-posta / telefon" />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>Şartlar / Anlaşma Detayları</label>
              <textarea name="terms" defaultValue={sponsor?.terms ?? ''} rows={5}
                placeholder="Logo kullanımı, süre, yükümlülükler, ödeme koşulları…"
                className="w-full resize-y rounded-[var(--radius-sm)] px-3 py-2.5 text-sm leading-relaxed outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>Notlar</label>
              <Input name="notes" defaultValue={sponsor?.notes ?? ''} placeholder="Ek notlar" />
            </div>

            {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
          </div>

          <div className="flex flex-shrink-0 justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Kaydediliyor…' : sponsor ? 'Güncelle' : 'Ekle'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
