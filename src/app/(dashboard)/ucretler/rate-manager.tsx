'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import type { Client, RateCard, User, WorkType, ContentLength } from '@/types';
import { upsertRateAction, deleteRateAction } from './actions';

const WORK_TYPES: WorkType[] = ['STREAM', 'VOICE', 'EDIT'];
const selectClass = cn(
  'flex h-10 w-full rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
  'px-3 py-2 text-sm text-[var(--color-text-primary)]',
  'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
);

function lengthLabel(l: ContentLength | null): string {
  if (l === 'SHORT') return tr.workItem.contentLength.SHORT;
  if (l === 'LONG') return tr.workItem.contentLength.LONG;
  return 'Farketmez';
}

/** Yayın → harita sayısı, diğerleri → uzunluk gösterir. */
function variantLabel(r: {
  work_type: WorkType;
  content_length: ContentLength | null;
  map_count: number | null;
}): string {
  if (r.work_type === 'STREAM') {
    return 'Harita başı';
  }
  return lengthLabel(r.content_length);
}

export function RateManager({
  users,
  clients,
  rates,
}: {
  users: User[];
  clients: Client[];
  rates: RateCard[];
}) {
  const router = useRouter();
  const [userId, setUserId] = React.useState(users[0]?.id ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Ekleme formu
  const [clientId, setClientId] = React.useState(clients[0]?.id ?? '');
  const [workType, setWorkType] = React.useState<WorkType>('STREAM');
  const [length, setLength] = React.useState<ContentLength | ''>('');
  const [pay, setPay] = React.useState('');
  const [bill, setBill] = React.useState('');

  const selectedClient = clients.find((c) => c.id === clientId);
  const isExternal = selectedClient ? !selectedClient.is_internal : false;
  const isStream = workType === 'STREAM';

  const userRates = rates.filter((r) => r.user_id === userId);

  const addRate = async () => {
    setError(null);
    const payNum = parseFloat(pay);
    if (!userId || !clientId) {
      setError('Kişi ve müşteri seçin.');
      return;
    }
    if (!(payNum > 0)) {
      setError('Hak ediş tutarı girin.');
      return;
    }
    // Dış ortakta faturalanan boşsa kâr yok kabul: faturalanan = hak ediş.
    let billNum: number | null = null;
    if (isExternal) {
      billNum = bill.trim() ? parseFloat(bill) : payNum;
      if (!(billNum >= 0)) {
        setError('Faturalanan tutar geçersiz.');
        return;
      }
    }

    // Yayın → harita başı tek fiyat (anahtar yok). Diğerleri → uzunluğa göre.
    const content_length = isStream ? null : length || null;

    setBusy(true);
    const res = await upsertRateAction({
      user_id: userId,
      client_id: clientId,
      work_type: workType,
      content_length,
      map_count: null,
      pay_amount: payNum,
      bill_amount: billNum,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Kaydedilemedi.');
      return;
    }
    setPay('');
    setBill('');
    setLength('');
    router.refresh();
  };

  const removeRate = async (id: string) => {
    setBusy(true);
    await deleteRateAction(id);
    setBusy(false);
    router.refresh();
  };

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--color-text-muted)]">
          Önce ekip üyesi ekleyin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kişi seçimi */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="rate-user">Kişi</Label>
            <select
              id="rate-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={selectClass}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Yeni fiyat ekle */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Yeni fiyat</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Müşteri</Label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={selectClass}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.is_internal ? ' (iç iş)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>İş türü</Label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as WorkType)}
                className={selectClass}
              >
                {WORK_TYPES.map((wt) => (
                  <option key={wt} value={wt}>
                    {tr.workItem.type[wt]}
                  </option>
                ))}
              </select>
            </div>
            {isStream ? (
              <div className="space-y-2">
                <Label>Fiyat tipi</Label>
                <div className="flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 text-sm text-[var(--color-text-secondary)]">
                  Harita başına (harita sayısı işte girilir)
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Uzunluk</Label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as ContentLength | '')}
                  className={selectClass}
                >
                  <option value="">Farketmez</option>
                  <option value="SHORT">{tr.workItem.contentLength.SHORT}</option>
                  <option value="LONG">{tr.workItem.contentLength.LONG}</option>
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{isStream ? 'Harita başı ücret (₺)' : 'Hak ediş (₺)'}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={isStream ? 'Her harita için' : 'Çalışanın aldığı'}
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                disabled={busy}
              />
            </div>
            {isExternal && (
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  {isStream
                    ? 'Harita başı faturalanan (₺) — müşterinin ödediği'
                    : 'Faturalanan (₺) — müşterinin ödediği'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Boş bırakırsan hak ediş ile aynı (kâr yok)"
                  value={bill}
                  onChange={(e) => setBill(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Kâr = faturalanan − hak ediş. Şimdilik aynı girersen kâr 0 olur.
                </p>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button onClick={addRate} isLoading={busy} disabled={busy}>
            Fiyatı kaydet
          </Button>
        </CardContent>
      </Card>

      {/* Mevcut fiyatlar */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            Tanımlı fiyatlar
          </h3>
          {userRates.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              Bu kişi için henüz fiyat tanımlı değil.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase text-[var(--color-text-muted)]">
                    <th className="pb-2 pr-4 font-medium">Müşteri</th>
                    <th className="pb-2 pr-4 font-medium">İş türü</th>
                    <th className="pb-2 pr-4 font-medium">Uzunluk / Harita</th>
                    <th className="pb-2 pr-4 text-right font-medium">Hak ediş</th>
                    <th className="pb-2 pr-4 text-right font-medium">Faturalanan</th>
                    <th className="pb-2 pr-4 text-right font-medium">Kâr</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {userRates.map((r) => {
                    const external = r.client ? !r.client.is_internal : r.bill_amount != null;
                    const profit =
                      external && r.bill_amount != null ? r.bill_amount - r.pay_amount : null;
                    const perMap = r.work_type === 'STREAM';
                    const suffix = perMap ? '/harita' : '';
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      >
                        <td className="py-2.5 pr-4 text-[var(--color-text-primary)]">
                          {r.client?.name ?? '—'}
                        </td>
                        <td className="py-2.5 pr-4">{tr.workItem.type[r.work_type]}</td>
                        <td className="py-2.5 pr-4">{variantLabel(r)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-[var(--color-text-primary)]">
                          {formatCurrency(r.pay_amount)}
                          {suffix}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono">
                          {external && r.bill_amount != null
                            ? `${formatCurrency(r.bill_amount)}${suffix}`
                            : '—'}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 pr-4 text-right font-mono',
                            profit != null && profit > 0 && 'text-[var(--color-success)]'
                          )}
                        >
                          {profit != null ? `${formatCurrency(profit)}${suffix}` : '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRate(r.id)}
                            disabled={busy}
                          >
                            Sil
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
