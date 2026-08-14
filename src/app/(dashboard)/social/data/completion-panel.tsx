'use client';

/**
 * Veri Merkezi'nin üst bloğu: ayın tamamlanma durumu + platform listesi +
 * tek birincil aksiyon ("Eksik Verileri Tamamla").
 *
 * Otomatik ve manuel veri görsel olarak ayrılır: otomatik bir alan eksikse
 * çözüm elle girmek değil, bağlantıyı düzeltmektir.
 */

import { useState } from 'react';
import { Check, Plug, Sparkles, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlatformTag } from '../social-ui';
import { monthLabel, type MonthCompleteness, type PlatformCompleteness } from '../social-monthly.constants';
import { CompletionWizard } from './completion-wizard';

export function CompletionPanel({ completeness }: { completeness: MonthCompleteness }) {
  const [open, setOpen] = useState(false);
  const { filled, total, percent, platforms, month, isComplete } = completeness;

  const manualPending = platforms.reduce((s, p) => s + p.pendingManualFields.length, 0);

  return (
    <section
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {monthLabel(month)} Raporu
          </h3>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            {filled} / {total} alan tamamlandı
            <span className="ml-2 font-mono" style={{ color: percent === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              %{percent}
            </span>
          </p>
        </div>

        {manualPending > 0 && (
          <Button type="button" onClick={() => setOpen(true)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Eksik Verileri Tamamla ({manualPending})
          </Button>
        )}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-sunken)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percent}%`,
            backgroundColor: isComplete ? 'var(--color-success)' : 'var(--color-accent)',
          }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {platforms.map((p) => <PlatformLine key={p.platform} p={p} />)}
      </div>

      {open && <CompletionWizard completeness={completeness} onClose={() => setOpen(false)} />}
    </section>
  );
}

function PlatformLine({ p }: { p: PlatformCompleteness }) {
  const complete = p.filled === p.total;
  // Platformun verisi API'den mi geliyor — rozet bunun için.
  const automatic = p.fields.some((f) => f.source === 'API');

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-sm)] px-2.5 py-2"
      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
    >
      <PlatformTag platform={p.platform} strong />

      <span
        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={automatic
          ? { backgroundColor: 'var(--color-info-muted)', color: 'var(--color-info)' }
          : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
      >
        {automatic ? 'Otomatik' : 'Manuel'}
      </span>

      <span className="font-mono text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
        {p.filled}/{p.total}
      </span>

      <span className="ml-auto flex items-center gap-1.5 text-[11.5px]">
        {complete ? (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
            <Check className="h-3.5 w-3.5" /> Tamamlandı
          </span>
        ) : (
          <>
            {p.pendingManualFields.length > 0 && (
              <span className="flex items-center gap-1" style={{ color: 'var(--color-warning)' }}>
                <TriangleAlert className="h-3.5 w-3.5" />
                {p.pendingManualFields.length} alan eksik
              </span>
            )}
            {p.brokenApiFields.length > 0 && (
              <span
                className="flex items-center gap-1"
                style={{ color: 'var(--color-error)' }}
                title={`${p.brokenApiFields.join(', ')} otomatik gelmeli`}
              >
                <Plug className="h-3.5 w-3.5" />
                {p.brokenApiFields.length} otomatik alan gelmiyor
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
}
