'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { DNA_SECTIONS } from '../engine.constants';
import { saveDna } from '../actions';

export function DnaEditor({
  initialSections,
  version,
}: {
  initialSections: Record<string, string>;
  version: number;
}) {
  const [sections, setSections] = React.useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const s of DNA_SECTIONS) base[s.key] = initialSections[s.key] ?? '';
    return base;
  });
  const [isPending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function set(key: string, value: string) {
    setSections((prev) => ({ ...prev, [key]: value }));
    setMsg(null);
  }

  function onSave() {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res = await saveDna(sections);
      if (res.error) setErr(res.error);
      else setMsg('DNA kaydedildi — yeni versiyon oluşturuldu.');
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--color-text-muted)]">
          Aktif versiyon: v{version}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DNA_SECTIONS.map((s) => (
          <div
            key={s.key}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
          >
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
              {s.label}
            </label>
            <p className="mt-0.5 mb-2 text-xs text-[var(--color-text-muted)]">{s.hint}</p>
            <textarea
              value={sections[s.key]}
              onChange={(e) => set(s.key, e.target.value)}
              rows={4}
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              placeholder="…"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? 'Kaydediliyor…' : 'DNA’yı Kaydet'}
        </Button>
        {msg && <span className="text-sm text-[var(--color-success)]">{msg}</span>}
        {err && <span className="text-sm text-[var(--color-error)]">{err}</span>}
      </div>
    </div>
  );
}
