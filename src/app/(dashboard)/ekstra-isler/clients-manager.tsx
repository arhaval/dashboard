'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';
import { createClientAction, updateClientAction } from './actions';

function Pill({ children, tone }: { children: React.ReactNode; tone: 'info' | 'muted' }) {
  const toneClass =
    tone === 'info'
      ? 'bg-[var(--color-info-muted)] text-[var(--color-info)]'
      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClass
      )}
    >
      {children}
    </span>
  );
}

export function ClientsManager({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [isInternal, setIsInternal] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  const add = async () => {
    setError(null);
    if (!name.trim()) {
      setError('İsim zorunlu.');
      return;
    }
    setBusy(true);
    const res = await createClientAction({ name, is_internal: isInternal, notes: notes || null });
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Eklenemedi.');
      return;
    }
    setName('');
    setIsInternal(false);
    setNotes('');
    router.refresh();
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(true);
    await updateClientAction(id, { name: editName.trim() });
    setBusy(false);
    setEditId(null);
    router.refresh();
  };

  const toggleActive = async (c: Client) => {
    setBusy(true);
    await updateClientAction(c.id, { is_active: !c.is_active });
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Ekleme formu */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Yeni müşteri / ortak
          </h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="client-name" required>
                İsim
              </Label>
              <Input
                id="client-name"
                placeholder="Örn. Sangal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={add} isLoading={busy} disabled={busy}>
                Ekle
              </Button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={busy}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            İç iş (Arhaval&apos;ın kendi işi — faturalama yok)
          </label>
          <div className="space-y-2">
            <Label htmlFor="client-notes">Not (opsiyonel)</Label>
            <Input
              id="client-notes"
              placeholder="Örn. Yayın anlaşması"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardContent className="pt-6">
          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              Henüz müşteri yok.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center justify-between gap-3 py-3',
                    !c.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {editId === c.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={busy}
                        className="max-w-xs"
                      />
                    ) : (
                      <span className="truncate font-medium text-[var(--color-text-primary)]">
                        {c.name}
                      </span>
                    )}
                    <Pill tone={c.is_internal ? 'info' : 'muted'}>
                      {c.is_internal ? 'İç iş' : 'Dış ortak'}
                    </Pill>
                    {!c.is_active && <Pill tone="muted">Pasif</Pill>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {editId === c.id ? (
                      <>
                        <Button size="sm" onClick={() => saveEdit(c.id)} disabled={busy}>
                          Kaydet
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditId(null)}
                          disabled={busy}
                        >
                          Vazgeç
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditId(c.id);
                            setEditName(c.name);
                          }}
                          disabled={busy}
                        >
                          Düzenle
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(c)}
                          disabled={busy}
                        >
                          {c.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
