'use client';

import type { TextGuardReport } from './text-guard.constants';

/** Aynı kalıp birden çok cümlede geçebilir; listede tekrar etmesin. */
function labelSummary(hits: { label: string }[]): string {
  const counts = new Map<string, number>();
  for (const h of hits) counts.set(h.label, (counts.get(h.label) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, n]) => (n > 1 ? `${label} ×${n}` : label))
    .join(', ');
}

/**
 * Deterministik metin denetiminin sonucu. ENGELLEYİCİ DEĞİL: yalnızca bilgi
 * verir, onaylamayı bloklamaz. Kural ihlali yoksa hiçbir şey göstermez.
 */
export function TextGuardNotice({ report }: { report: TextGuardReport }) {
  if (!report.hasWarning) return null;
  const { connectors, clichePayoff } = report;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-muted)] px-4 py-3 text-sm text-[var(--color-warning)]">
      <p className="font-medium">Kural uyarısı — engelleyici değil, istersen yok say.</p>

      {connectors.over && (
        <div className="mt-2">
          <p>
            Konuşma bağlacı / izleyiciye dönüş / kendi kendine itiraz:{' '}
            <span className="font-mono tabular-nums">{connectors.count}</span> bulundu, eşik{' '}
            <span className="font-mono tabular-nums">{connectors.limit}</span>.
          </p>
          <p className="mt-0.5 text-[var(--color-text-secondary)]">
            Bulunanlar: {labelSummary(connectors.hits)}
          </p>
          <ul className="mt-1.5 space-y-1">
            {connectors.hits.map((h, i) => (
              <li key={`${h.label}-${i}`} className="text-xs text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-muted)]">{h.label}</span> — {h.sentence}
              </li>
            ))}
          </ul>
        </div>
      )}

      {clichePayoff.hits.length > 0 && (
        <div className="mt-2">
          <p>Son cümlede klişe kapanış kalıbı: {labelSummary(clichePayoff.hits)}</p>
          {clichePayoff.lastSentence && (
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {clichePayoff.lastSentence}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
