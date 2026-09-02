'use client';

import * as React from 'react';
import Link from 'next/link';
import type { EditSignalDTO } from '../engine.constants';
import { formatDelta, signalDelta } from './learning.constants';

function when(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Column({ title, text, empty }: { title: string; text: string | null; empty: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </p>
      <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {text?.trim() ? text : <span className="text-[var(--color-text-muted)]">{empty}</span>}
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: EditSignalDTO }) {
  const [open, setOpen] = React.useState(false);
  const delta = signalDelta(signal);
  const deltaLabel = formatDelta(delta.diff);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {signal.script_title ?? 'Başlıksız metin'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {signal.format_label ?? 'Format atanmamış'} · {when(signal.created_at)}
            {signal.prompt_version ? ` · prompt ${signal.prompt_version}` : ''}
            {signal.dna_version !== null ? ` · DNA v${signal.dna_version}` : ''}
            {signal.format_version !== null ? ` · format v${signal.format_version}` : ''}
          </p>
          {signal.edit_reason ? (
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              “{signal.edit_reason}”
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">Gerekçe yazılmadı</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm tabular-nums text-[var(--color-text-primary)]">
            {deltaLabel ?? '—'}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {delta.ai === null ? 'üretim yok' : `${delta.ai} → ${delta.final} kelime`}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <div className="flex flex-col gap-4 md:flex-row">
            <Column title="AI çıktısı" text={signal.ai_text} empty="Bu final bir üretime dayanmıyor." />
            <Column title="Onaylanan final" text={signal.final_text} empty="Final metin boş." />
          </div>
          {signal.script_id && (
            <Link
              href={`/motor/${signal.script_id}`}
              className="mt-3 inline-block text-xs text-[var(--color-accent)]"
            >
              Metni aç →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function SignalList({ signals }: { signals: EditSignalDTO[] }) {
  if (signals.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
        Henüz sinyal yok. Bir metni final olarak onayladığında AI çıktısı ile onayladığın hâli
        buraya düşecek.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {signals.map((s) => (
        <SignalRow key={s.id} signal={s} />
      ))}
    </div>
  );
}
