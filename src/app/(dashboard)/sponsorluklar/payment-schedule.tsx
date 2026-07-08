'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Plus, Trash2, ListPlus, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  generatePaymentSchedule,
  addSponsorPayment,
  updateSponsorPayment,
  toggleSponsorPayment,
  deleteSponsorPayment,
} from './actions';
import type { Sponsor, SponsorPayment } from './sponsor.constants';

interface Props {
  sponsor: Sponsor;
  payments: SponsorPayment[];
}

function formatMoney(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

export function PaymentSchedule({ sponsor, payments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const paidTotal = payments.filter((p) => p.is_paid).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = total - paidTotal;

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generatePaymentSchedule(sponsor.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleEditSave(paymentId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.append('payment_id', paymentId);
    fd.append('sponsor_id', sponsor.id);
    setError(null);
    startTransition(async () => {
      const res = await updateSponsorPayment(fd);
      if (res.error) setError(res.error);
      else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append('sponsor_id', sponsor.id);
    setError(null);
    startTransition(async () => {
      const res = await addSponsorPayment(fd);
      if (res.error) setError(res.error);
      else {
        form.reset();
        setShowAdd(false);
        router.refresh();
      }
    });
  }

  const cardStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' };

  return (
    <div className="mb-6 rounded-[var(--radius-md)] border p-5" style={cardStyle}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Ödeme Planı</h3>
          {sponsor.payment_type === 'MONTHLY' && sponsor.monthly_amount != null && (
            <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
              Aylık {formatMoney(sponsor.monthly_amount)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sponsor.payment_type === 'MONTHLY' && payments.length === 0 && (
            <Button variant="secondary" onClick={handleGenerate} disabled={isPending}>
              <ListPlus className="mr-2 h-4 w-4" /> Plan Oluştur
            </Button>
          )}
          <Button variant="ghost" onClick={() => setShowAdd((v) => !v)} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" /> Ödeme Ekle
          </Button>
        </div>
      </div>

      {error && <p className="mb-3 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 grid grid-cols-1 gap-2 rounded-[var(--radius-sm)] p-3 sm:grid-cols-[1fr_auto_auto_auto]" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <Input name="label" placeholder="Açıklama (örn. 1. Taksit)" required />
          <Input name="amount" type="number" step="0.01" min="0" placeholder="Tutar ₺" required className="sm:w-32" />
          <Input name="due_date" type="date" className="sm:w-40" />
          <Button type="submit" disabled={isPending}>Ekle</Button>
        </form>
      )}

      {payments.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Henüz ödeme kaydı yok. {sponsor.payment_type === 'MONTHLY' ? '"Plan Oluştur" ile aylık taksitleri üretin veya' : ''} "Ödeme Ekle" ile manuel ekleyin.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--color-text-muted)' }} className="text-left text-xs uppercase tracking-wider">
                  <th className="px-2 py-2 font-medium">Dönem / Açıklama</th>
                  <th className="px-2 py-2 font-medium">Vade</th>
                  <th className="px-2 py-2 text-right font-medium">Tutar</th>
                  <th className="px-2 py-2 font-medium">Durum</th>
                  <th className="px-2 py-2 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => {
                  const rowBg = i % 2 === 0 ? 'transparent' : 'var(--color-bg-tertiary)';
                  if (editingId === p.id) {
                    return (
                      <tr key={p.id} style={{ backgroundColor: rowBg }}>
                        <td colSpan={5} className="px-2 py-2">
                          <form onSubmit={(e) => handleEditSave(p.id, e)} className="flex flex-wrap items-center gap-2">
                            <Input name="label" defaultValue={p.label} placeholder="Açıklama" required className="min-w-[8rem] flex-1" />
                            <Input name="amount" type="number" step="0.01" min="0" defaultValue={Number(p.amount)} placeholder="Tutar ₺" required className="w-32" />
                            <Input name="due_date" type="date" defaultValue={p.due_date ?? ''} className="w-40" />
                            <button type="submit" disabled={isPending} className="rounded p-1.5 transition-colors hover:bg-black/5 disabled:opacity-50" title="Kaydet" style={{ color: 'var(--color-success)' }}>
                              <Check className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} disabled={isPending} className="rounded p-1.5 transition-colors hover:bg-black/5 disabled:opacity-50" title="İptal" style={{ color: 'var(--color-text-muted)' }}>
                              <X className="h-4 w-4" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={p.id} style={{ backgroundColor: rowBg }}>
                      <td className="px-2 py-2.5" style={{ color: 'var(--color-text-primary)' }}>{p.label}</td>
                      <td className="px-2 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(p.due_date)}</td>
                      <td className="px-2 py-2.5 text-right font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatMoney(Number(p.amount))}</td>
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => run(() => toggleSponsorPayment(p.id, sponsor.id, !p.is_paid))}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={p.is_paid
                            ? { backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }
                            : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                          title={p.is_paid ? 'Ödenmedi olarak işaretle (gelir kaydını siler)' : 'Ödendi olarak işaretle (finansa gelir yazar)'}
                        >
                          {p.is_paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                          {p.is_paid ? `Ödendi · ${formatDate(p.paid_date)}` : 'Ödenmedi'}
                        </button>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => { setError(null); setEditingId(p.id); }}
                            disabled={isPending}
                            className="rounded p-1 transition-colors hover:bg-black/5 disabled:opacity-50"
                            title="Tutarı düzenle" style={{ color: 'var(--color-info)' }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm('Bu ödeme kaydını sil? Ödendiyse gelir kaydı da silinir.')) run(() => deleteSponsorPayment(p.id, sponsor.id)); }}
                            disabled={isPending}
                            className="rounded p-1 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                            title="Sil" style={{ color: 'var(--color-error)' }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t pt-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Toplam: <strong style={{ color: 'var(--color-text-primary)' }}>{formatMoney(total)}</strong></span>
            <span style={{ color: 'var(--color-text-muted)' }}>Ödenen: <strong style={{ color: 'var(--color-success)' }}>{formatMoney(paidTotal)}</strong></span>
            <span style={{ color: 'var(--color-text-muted)' }}>Kalan: <strong style={{ color: remaining > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{formatMoney(remaining)}</strong></span>
          </div>
        </>
      )}
    </div>
  );
}
