/**
 * 4 ana KPI — ekranın karar sayıları.
 *
 * Sayfadaki TEK kutulu blok bunlar: her bölüm çerçeveli olunca hiçbiri öne
 * çıkmıyordu. Miktarlar serif + tabular-nums (İçerik Performansı ile aynı
 * sistem), etiketler sans.
 *
 * Eksik veri varsa yüzde GÖSTERİLMEZ; kapsam değişikliğini düşüş gibi sunmak
 * yanıltır. Onun yerine kaç platformdan veri geldiği yazar.
 */

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { compact, full, type Kpi } from './social-overview.constants';
import { Amount, MicroLabel } from './social-ui';

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded-[var(--radius-md)] sm:grid-cols-2 xl:grid-cols-4"
      style={{ backgroundColor: 'var(--color-border)', border: '1px solid var(--color-border)' }}
    >
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
    <div className="p-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <MicroLabel>{kpi.label}</MicroLabel>

      <div className="mt-2">
        <Amount tone={kpi.value == null ? 'var(--color-text-muted)' : undefined}>
          {kpi.value == null ? '—' : fmtValue(kpi.value)}
        </Amount>
      </div>

      <div className="mt-2 min-h-[16px]">
        {kpi.delta != null ? (
          <span
            className="inline-flex items-center gap-1 text-[11.5px]"
            style={{ color: deltaColor, fontVariantNumeric: 'tabular-nums' }}
          >
            <Arrow className="h-3.5 w-3.5" />
            {positive ? '+' : '−'}{fmtValue(Math.abs(kpi.delta))}
            {kpi.percent != null && <span style={{ opacity: 0.7 }}>%{Math.abs(kpi.percent)}</span>}
          </span>
        ) : kpi.value != null ? (
          <span className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
            kıyas yok
          </span>
        ) : null}
      </div>

      {kpi.hasGaps && (
        <p className="mt-1 text-[10.5px]" style={{ color: 'var(--color-warning)' }}>
          {kpi.reporting}/{kpi.expected} platformdan veri
        </p>
      )}
    </div>
  );
}
