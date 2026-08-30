'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PLAYBOOK_SECTIONS, type FormatDTO, type FormatVersionDTO } from '../engine.constants';
import { saveFormatPlaybook, getFormatVersions } from '../actions';

export function FormatEditor({ formats }: { formats: FormatDTO[] }) {
  const [activeId, setActiveId] = React.useState<string>(formats[0]?.id ?? '');
  const active = formats.find((f) => f.id === activeId) ?? formats[0];

  if (!active) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Henüz format yok. Migration çalıştırıldığında 7 format hazır gelir.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Format list */}
      <div className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
        {formats.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveId(f.id)}
            className={`text-left rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors ${
              f.id === active.id
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Editor for the active format — remounts on change via key */}
      <FormatPlaybookForm key={active.id} format={active} />
    </div>
  );
}

function FormatPlaybookForm({ format }: { format: FormatDTO }) {
  const [pb, setPb] = React.useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const s of PLAYBOOK_SECTIONS) base[s.key] = format.playbook[s.key] ?? '';
    return base;
  });
  const [isPending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [history, setHistory] = React.useState<FormatVersionDTO[] | null>(null);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  function onSave() {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res = await saveFormatPlaybook(format.id, pb);
      if (res.error) setErr(res.error);
      else {
        setMsg('Format kuralları kaydedildi.');
        setHistory(null); // stale after a new version
      }
    });
  }

  function toggleHistory() {
    if (history) {
      setHistory(null);
      return;
    }
    setLoadingHistory(true);
    getFormatVersions(format.id)
      .then((v) => setHistory(v))
      .finally(() => setLoadingHistory(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{format.label}</h3>
        <span className="text-xs font-mono text-[var(--color-text-muted)]">v{format.version}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLAYBOOK_SECTIONS.map((s) => (
          <div
            key={s.key}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
          >
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
              {s.label}
            </label>
            <p className="mt-0.5 mb-2 text-xs text-[var(--color-text-muted)]">{s.hint}</p>
            <textarea
              value={pb[s.key]}
              onChange={(e) => {
                setPb((prev) => ({ ...prev, [s.key]: e.target.value }));
                setMsg(null);
              }}
              rows={3}
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
        {format.version > 1 && (
          <Button variant="ghost" onClick={toggleHistory} disabled={loadingHistory}>
            {loadingHistory ? 'Yükleniyor…' : history ? 'Geçmişi gizle' : 'Geçmiş sürümler'}
          </Button>
        )}
        {msg && <span className="text-sm text-[var(--color-success)]">{msg}</span>}
        {err && <span className="text-sm text-[var(--color-error)]">{err}</span>}
      </div>

      {history && (
        <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            Playbook geçmişi ({history.length} sürüm)
          </p>
          {history.map((h) => (
            <details key={h.version} className="group">
              <summary className="cursor-pointer text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                v{h.version}
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                  {new Date(h.created_at).toLocaleString('tr-TR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </summary>
              <div className="mt-1.5 space-y-1 pl-3 border-l border-[var(--color-border)]">
                {PLAYBOOK_SECTIONS.map((s) =>
                  h.playbook[s.key]?.trim() ? (
                    <p key={s.key} className="text-xs text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">{s.label}:</span>{' '}
                      {h.playbook[s.key]}
                    </p>
                  ) : null
                )}
                {!PLAYBOOK_SECTIONS.some((s) => h.playbook[s.key]?.trim()) && (
                  <p className="text-xs text-[var(--color-text-muted)]">(boş)</p>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
