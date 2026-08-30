'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SOURCE_TYPE_OPTIONS, type FormatDTO, type ReferenceDTO } from '../engine.constants';
import { createReference, deleteReference } from '../actions';

export function ReferenceManager({
  references,
  formats,
}: {
  references: ReferenceDTO[];
  formats: FormatDTO[];
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createReference(fd);
      if (res.error) setErr(res.error);
      else {
        formRef.current?.reset();
        setShowForm(false);
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteReference(id);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-secondary)]">
          {references.length} referans
        </span>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? 'Vazgeç' : 'Referans Ekle'}
        </Button>
      </div>

      {showForm && (
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-xs text-[var(--color-text-muted)]">Başlık *</label>
              <Input name="title" required placeholder="ör. NavarrO belgesel dökümü" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Format</label>
              <Select name="format_id" defaultValue="">
                <option value="">— Format yok —</option>
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Kaynak türü</label>
              <Select name="source_type" defaultValue="SRT">
                {SOURCE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">
              Etiketler (virgülle ayır)
            </label>
            <Input name="tags" placeholder="hikaye, duygusal, transfer" />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">
              İçerik metni / SRT * <span className="text-[var(--color-text-muted)]">— SRT ise zaman kodları ve tekrarlar otomatik temizlenir, orijinali ayrı saklanır</span>
            </label>
            <textarea
              name="body"
              required
              rows={8}
              placeholder="SRT dosyasının içeriğini ya da düz metni buraya yapıştır…"
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Not (opsiyonel)</label>
            <Input name="notes" placeholder="Neden referans aldık, neye dikkat…" />
          </div>
          {err && <p className="text-sm text-[var(--color-error)]">{err}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Ekleniyor…' : 'Kaydet'}
          </Button>
        </form>
      )}

      {references.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          Henüz referans yok. İlk SRT’lerini buraya ekleyerek stil kütüphanesini başlat.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {references.map((r) => (
            <div
              key={r.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{r.title}</h4>
                <button
                  onClick={() => onDelete(r.id)}
                  disabled={isPending}
                  className="text-xs text-[var(--color-error)] hover:underline shrink-0"
                >
                  Sil
                </button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">
                  {r.source_type}
                </span>
                {r.format_label && (
                  <span className="rounded px-1.5 py-0.5 bg-[var(--color-info-muted)] text-[var(--color-info)]">
                    {r.format_label}
                  </span>
                )}
                {r.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded px-1.5 py-0.5 bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-muted)] line-clamp-3 whitespace-pre-wrap">
                {r.body.slice(0, 240)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
