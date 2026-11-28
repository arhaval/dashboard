'use client';

/**
 * Planlı yayın yönetimi (admin): yeni plan formu + açık planlar listesi.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Radio, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { relFuture, shortDate, todayStr } from '@/components/dashboard/utils';
import type { Client, ContentPlan } from '@/types';
import { createStreamPlan, cancelStreamPlan } from './actions';

interface Props {
  publishers: { id: string; full_name: string }[];
  clients: Client[];
  plans: ContentPlan[];
}

export function PlanManager({ publishers, clients, plans }: Props) {
  const router = useRouter();
  const internalId = clients.find((c) => c.is_internal)?.id ?? '';
  const [form, setForm] = React.useState({ title: '', planned_date: todayStr(), assigned_to: publishers[0]?.id ?? '', client_id: internalId });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const today = todayStr();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createStreamPlan({ ...form, client_id: form.client_id || null });
    setBusy(false);
    if (!res.success) return setError(res.error ?? 'Eklenemedi');
    setForm((f) => ({ ...f, title: '' }));
    router.refresh();
  };

  const cancel = async (id: string) => {
    setBusy(true);
    await cancelStreamPlan(id);
    setBusy(false);
    setConfirmId(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
          <CalendarPlus className="h-4 w-4 text-[var(--color-text-secondary)]" /> Yeni planlı yayın
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="assigned_to">Yayıncı</Label>
            <Select id="assigned_to" value={form.assigned_to} onChange={set('assigned_to')} disabled={busy}>
              {publishers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="planned_date">Tarih</Label>
            <Input id="planned_date" type="date" value={form.planned_date} onChange={set('planned_date')} disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Maç</Label>
            <Input id="title" placeholder="Örn. Eternal Fire vs Sangal" value={form.title} onChange={set('title')} disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client_id">Kimin için</Label>
            <Select id="client_id" value={form.client_id} onChange={set('client_id')} disabled={busy}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_internal ? '' : ' (ekstra iş)'}</option>)}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" size="sm" isLoading={busy} disabled={busy || publishers.length === 0}>Planla</Button>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          {publishers.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Önce yayıncı rolünde bir hesap olmalı.</p>}
        </div>
      </form>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
          Açık planlar
          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--color-text-secondary)]">{plans.length}</span>
        </h2>
        {plans.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-10 text-center text-sm text-[var(--color-text-muted)]">
            Açık plan yok. Yukarıdan yaklaşan bir yayını planla.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {plans.map((p) => {
              const late = p.planned_date < today;
              const external = p.client && !p.client.is_internal;
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: late ? 'var(--color-warning-muted)' : 'var(--color-accent-muted)', color: late ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                    <Radio className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{p.title}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {p.assignee?.full_name ?? '—'} · {late ? `${shortDate(p.planned_date)} · girilmedi` : relFuture(p.planned_date, today)}
                    </p>
                  </div>
                  {external && (
                    <span className="hidden rounded-full bg-[var(--color-warning-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-warning)] sm:inline">
                      {p.client!.name}
                    </span>
                  )}
                  {confirmId === p.id ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="destructive" onClick={() => cancel(p.id)} disabled={busy}>Evet, iptal</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} disabled={busy}>Vazgeç</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(p.id)} disabled={busy}>İptal</Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
