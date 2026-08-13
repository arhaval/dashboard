/**
 * Aylık özet paneli — sayfanın en üstünde, sayıdan önce SONUÇ.
 *
 * Üç soruyu düz Türkçe cevaplar: ne yaptım, nasıl gitti, nerede yükseliyorum.
 * Cümleleri buildMonthlySummary üretir; burada yalnızca gösterim var.
 */

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { fmt, type MonthlySummary, type PlatformSummary } from './social-summary.constants';

const BLOCKS: { key: 'did' | 'went' | 'rising'; title: string }[] = [
  { key: 'did', title: 'Ne yaptın' },
  { key: 'went', title: 'Nasıl gitti' },
  { key: 'rising', title: 'Nerede yükseliyorsun' },
];

export function MonthlyOverview({ summary, percent }: { summary: MonthlySummary; percent: number }) {
  return (
    <section
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {summary.monthLabel} — Aylık Özet
        </h3>
        <span className="text-[11px]" style={{ color: percent === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
          veri girişi %{percent}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {BLOCKS.map(({ key, title }) => (
          <div key={key}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
              {title}
            </p>
            {summary[key].length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>—</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {summary[key].map((line, i) => (
                  <li key={i} className="flex gap-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {summary.warnings.length > 0 && (
        <div
          className="mt-4 rounded-[var(--radius-sm)] p-3"
          style={{ backgroundColor: 'var(--color-warning-muted)', border: '1px solid var(--color-border)' }}
        >
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-warning)' }}>
            <AlertTriangle className="h-3.5 w-3.5" />
            Veri eksik — sayılar olduğundan düşük görünüyor
          </p>
          <ul className="flex flex-col gap-1">
            {summary.warnings.map((w, i) => (
              <li key={i} className="text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tek tek platform — toplamın altında, aynı ekranda */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Platform platform
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {summary.platforms.map((p) => <PlatformRow key={p.platform} platform={p} />)}
        </div>
      </div>
    </section>
  );
}

function PlatformRow({ platform }: { platform: PlatformSummary }) {
  const { reach, followers } = platform;
  const movement = reach.movement;

  const Icon = movement === 'RISING' ? TrendingUp : movement === 'FALLING' ? TrendingDown : Minus;
  const color =
    movement === 'RISING' ? 'var(--color-success)' :
    movement === 'FALLING' ? 'var(--color-error)' :
    'var(--color-text-muted)';

  return (
    <div
      className="rounded-[var(--radius-sm)] p-2.5"
      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{platform.label}</span>
        {reach.percent != null && (
          <span className="ml-auto font-mono text-[11px]" style={{ color }}>
            {reach.percent >= 0 ? '+' : ''}{reach.percent}%
          </span>
        )}
      </div>

      <div className="mt-1.5 flex gap-4">
        <Figure label={platform.reachLabel} value={reach.current} />
        <Figure label="Takipçi" value={followers.current} delta={followers.delta} />
      </div>
    </div>
  );
}

function Figure({ label, value, delta }: { label: string; value: number | null; delta?: number | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="font-mono text-[13px]" style={{ color: value == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
        {value == null ? '—' : fmt(value)}
        {delta != null && delta !== 0 && (
          <span className="ml-1 text-[10px]" style={{ color: delta > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))}
          </span>
        )}
      </p>
    </div>
  );
}
