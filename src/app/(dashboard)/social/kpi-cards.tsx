/**
 * 4 ana KPI kartı — ekranın ilk satırı, 10 saniyelik cevabın çekirdeği.
 *
 * Eksik veri varsa yüzde GÖSTERİLMEZ; onun yerine "Eksik veri var" uyarısı
 * çıkar. Eksik kapsamla üretilen yüzde, düşüş gibi görünen bir kapsam
 * değişikliğidir — yanıltır.
 */

import { AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { compact, full, type Kpi } from './social-overview.constants';

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const positive = (kpi.delta ?? 0) >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  const deltaColor = positive ? 'var(--color-success)' : 'var(--color-error)';
  // Takipçi "kaç kişi" sorusudur — kısaltma bilgi kaybettirir.
  const fmtValue = kpi.key === 'followers' ? full : compact;

  return (
    <div
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {kpi.label}
      </p>

      <p className="mt-1.5 text-[26px] font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        {kpi.value == null ? '—' : fmtValue(kpi.value)}
      </p>

      <div className="mt-2 min-h-[18px]">
        {kpi.delta != null ? (
          <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: deltaColor }}>
            <Arrow className="h-3.5 w-3.5" />
            {positive ? '+' : '−'}{fmtValue(Math.abs(kpi.delta))}
            {kpi.percent != null && <span style={{ opacity: 0.75 }}>· %{Math.abs(kpi.percent)}</span>}
            <span style={{ color: 'var(--color-text-muted)' }}>bu ay</span>
          </span>
        ) : kpi.value != null ? (
          <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            geçen ayla kıyaslanamıyor
          </span>
        ) : null}
      </div>

      {kpi.hasGaps && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-warning)' }}>
          <AlertTriangle className="h-3 w-3" />
          Eksik veri var ({kpi.reporting}/{kpi.expected} platform)
        </p>
      )}
    </div>
  );
}
