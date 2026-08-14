/**
 * Bütün platformlar TEK tabloda — aynı sayı başka hiçbir yerde tekrarlanmaz.
 *
 * Çerçevesiz: KPI kartları sayfanın tek kutulu bloğu. Burada yalnızca ince
 * satır çizgileri var, tablo sayfanın içinde duruyor.
 *
 * Renk disiplini: platform rengi küçük bir nokta; sayılar mono + tabular-nums
 * olduğu için sütunlar hizalı okunuyor.
 */

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { compact, type PlatformRow, type RowStatus } from './social-overview.constants';
import { Figure, PlatformTag, Section } from './social-ui';

const STATUS_META: Record<RowStatus, { label: string; color: string }> = {
  UP: { label: 'Yükseliyor', color: 'var(--color-success)' },
  DOWN: { label: 'Düşüyor', color: 'var(--color-error)' },
  FLAT: { label: 'Yatay', color: 'var(--color-text-muted)' },
  MISSING: { label: 'Veri eksik', color: 'var(--color-warning)' },
};

export function PlatformTable({ rows }: { rows: PlatformRow[] }) {
  return (
    <Section title="Platformlar">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <Th>Platform</Th>
              <Th align="right">Takipçi</Th>
              <Th align="right">Değişim</Th>
              <Th align="right">Görüntülenme</Th>
              <Th align="right">Etkileşim</Th>
              <Th align="right">Durum</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = STATUS_META[r.status];
              const dim = r.status === 'MISSING';
              return (
                <tr key={r.platform} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="py-2.5 pr-3">
                    <PlatformTag platform={r.platform} muted={dim} strong />
                  </td>
                  <Td>{r.followers == null ? '—' : compact(r.followers)}</Td>
                  <td className="px-3 py-2.5 text-right">
                    {r.followersDelta == null || r.followersDelta === 0 ? (
                      <Figure tone="var(--color-text-muted)">—</Figure>
                    ) : (
                      <Figure tone={r.followersDelta > 0 ? 'var(--color-success)' : 'var(--color-error)'}>
                        {r.followersDelta > 0 ? '+' : '−'}{compact(Math.abs(r.followersDelta))}
                      </Figure>
                    )}
                  </td>
                  <Td>{r.views == null ? '—' : compact(r.views)}</Td>
                  <Td>{r.engagement == null ? '—' : compact(r.engagement)}</Td>
                  <td className="py-2.5 pl-3 text-right">
                    <StatusCell status={r.status} percent={r.viewsPercent} label={status.label} color={status.color} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function StatusCell({
  status,
  percent,
  label,
  color,
}: {
  status: RowStatus;
  percent: number | null;
  label: string;
  color: string;
}) {
  if (status === 'MISSING') {
    return <span className="text-[11.5px]" style={{ color }}>{label}</span>;
  }
  const Icon = status === 'UP' ? TrendingUp : status === 'DOWN' ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center justify-end gap-1" style={{ color }} title={label}>
      <Icon className="h-3.5 w-3.5" />
      {percent != null && <Figure tone={color}>{percent > 0 ? '+' : ''}{percent}%</Figure>}
    </span>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className="pb-2 text-[10px] font-semibold uppercase"
      style={{
        color: 'var(--color-text-muted)',
        letterSpacing: '0.11em',
        textAlign: align ?? 'left',
        whiteSpace: 'nowrap',
        paddingLeft: align === 'right' ? 12 : 0,
        paddingRight: align === 'right' ? 12 : 0,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2.5 text-right">
      <Figure>{children}</Figure>
    </td>
  );
}
