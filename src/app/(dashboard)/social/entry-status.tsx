/**
 * Eksik giriş haritası — "bu ay tam giremedim" sorusunun tek tek cevabı.
 *
 * Her platformun hangi alanı boş, ADIYLA görünür. İki eksik türü ayrılır:
 *   elle girilecek → senin işin
 *   otomatik gelmeli ama gelmemiş → entegrasyon sorunu, elle girmenin anlamı yok
 */

import { Check, AlertTriangle, Plug } from 'lucide-react';
import { monthLabel, type MonthCompleteness, type PlatformCompleteness } from './social-monthly.constants';

export function EntryStatus({ completeness }: { completeness: MonthCompleteness }) {
  const { platforms, filled, total, percent, month } = completeness;

  return (
    <section
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {monthLabel(month)} — Veri Girişi Durumu
        </h3>
        <span className="font-mono text-[12px]" style={{ color: percent === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
          {filled}/{total} alan · %{percent}
        </span>
      </div>

      {/* Doluluk çubuğu — tek bakışta ne kadar eksik olduğu */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-sunken)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            backgroundColor: percent === 100 ? 'var(--color-success)' : 'var(--color-accent)',
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {platforms.map((p) => <PlatformLine key={p.platform} p={p} />)}
      </div>
    </section>
  );
}

function PlatformLine({ p }: { p: PlatformCompleteness }) {
  const complete = p.filled === p.total;

  return (
    <div
      className="rounded-[var(--radius-sm)] px-2.5 py-2"
      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2">
        {complete
          ? <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
          : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />}
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.label}</span>
        <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {p.filled}/{p.total}
        </span>
      </div>

      {p.missing && (
        <p className="mt-1 text-[11.5px]" style={{ color: 'var(--color-warning)' }}>
          Bu ay için hiç kayıt yok.
        </p>
      )}

      {p.pendingManualFields.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>elle girilecek:</span>
          {p.pendingManualFields.map((f) => (
            <span
              key={f}
              className="rounded px-1.5 py-0.5 text-[10.5px]"
              style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {p.brokenApiFields.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Plug className="h-3 w-3" style={{ color: 'var(--color-error)' }} />
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            otomatik gelmeli, gelmemiş:
          </span>
          {p.brokenApiFields.map((f) => (
            <span
              key={f}
              className="rounded px-1.5 py-0.5 text-[10.5px]"
              style={{ backgroundColor: 'var(--color-error-muted)', color: 'var(--color-error)' }}
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
