'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  STATUS_META,
  PLATFORM_OPTIONS,
  type FormatDTO,
  type ScriptDTO,
} from './engine.constants';
import { createScript } from './actions';

export function ScriptList({
  scripts,
  formats,
}: {
  scripts: ScriptDTO[];
  formats: FormatDTO[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(scripts.length === 0);
  const [isPending, startTransition] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createScript(fd);
      if (res.error) setErr(res.error);
      else if (res.id) router.push(`/motor/${res.id}`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-secondary)]">{scripts.length} metin</span>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? 'Vazgeç' : 'Yeni Metin'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Başlık *</label>
              <Input name="title" required placeholder="ör. XANTARES neden efsane?" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Konu</label>
              <Input name="topic" placeholder="Kısa konu / bağlam" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Format</label>
              <Select name="format_id" defaultValue="">
                <option value="">— Seçilmedi —</option>
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">Platform</label>
                <Select name="platform" defaultValue="">
                  <option value="">—</option>
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">Hedef süre</label>
                <Input name="target_duration" placeholder="60 sn / 8-10 dk" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Taslak metin</label>
            <textarea
              name="draft_text"
              rows={5}
              placeholder="Ham taslağını buraya yaz. AI yalnızca burada ve ek bilgilerde yazanı kullanır — bilgi uydurmaz."
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Ek nesnel bilgiler (opsiyonel)</label>
            <textarea
              name="source_facts"
              rows={3}
              placeholder="Taslakta olmayan ama kullanılabilecek doğrulanmış bilgiler (tarih, sayı, isim…)"
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          {err && <p className="text-sm text-[var(--color-error)]">{err}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Oluşturuluyor…' : 'Oluştur ve Aç'}
          </Button>
        </form>
      )}

      {scripts.length > 0 && (
        <div className="grid gap-2.5">
          {scripts.map((s) => {
            const meta = STATUS_META[s.status];
            return (
              <Link
                key={s.id}
                href={`/motor/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 hover:border-[var(--color-border-hover)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {s.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    {s.format_label && <span>{s.format_label}</span>}
                    {s.platform && <span>· {s.platform}</span>}
                    {s.target_duration && <span>· {s.target_duration}</span>}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
