/**
 * Bütün platformlar TEK tabloda. Eskiden aynı sayılar hem özet kartlarında,
 * hem detay kartlarında, hem geçmiş tablosunda tekrarlanıyordu; burada bir kez
 * gösterilir.
 *
 * Platform renkleri yalnızca rozet seviyesinde — panelin ana dili siyah/turuncu
 * kalır.
 */

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { compact, type PlatformRow, type RowStatus } from './social-overview.constants';
// Rozet renkleri mevcut tek kaynaktan (7 platformu da kapsıyor).
import { getPlatformBadgeClass } from '@/lib/utils';

const STATUS_META: Record<RowStatus, { label: string; color: string }> = {
  UP: { label: 'Yükseliyor', color: 'var(--color-success)' },
  DOWN: { label: 'Düşüyor', color: 'var(--color-error)' },
  FLAT: { label: 'Yatay', color: 'var(--color-text-secondary)' },
  MISSING: { label: 'Veri Eksik', color: 'var(--color-warning)' },
};

export function PlatformTable({ rows }: { rows: PlatformRow[] }) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-md)]"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 620 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <Th>Platform</Th>
              <Th align="right">Takipçi</Th>
              <Th align="right">Değişim</Th>
              <Th align="right">Görüntülenme</Th>
              <Th align="right">Etkileşim</Th>
              <Th align="right">Durum</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const status = STATUS_META[r.status];
              return (
                <tr
                  key={r.platform}
                  style={{
                    backgroundColor: i % 2 ? 'var(--color-table-row-even)' : 'var(--color-table-row-odd)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <td className="px-3.5 py-2.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${getPlatformBadgeClass(r.platform)}`}>
                      {r.label}
                    </span>
                  </td>
                  <Td>{r.followers == null ? '—' : compact(r.followers)}</Td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px]">
                    {r.followersDelta == null || r.followersDelta === 0 ? (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    ) : (
                      <span style={{ color: r.followersDelta > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {r.followersDelta > 0 ? '+' : '−'}{compact(Math.abs(r.followersDelta))}
                      </span>
                    )}
                  </td>
                  <Td>{r.views == null ? '—' : compact(r.views)}</Td>
                  <Td>{r.engagement == null ? '—' : compact(r.engagement)}</Td>
                  <td className="px-3.5 py-2.5 text-right">
                    <StatusCell status={r.status} percent={r.viewsPercent} label={status.label} color={status.color} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ backgroundColor: 'var(--color-warning-muted)', color }}
      >
        {label}
      </span>
    );
  }
  const Icon = status === 'UP' ? TrendingUp : status === 'DOWN' ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center justify-end gap-1 text-[12px]" style={{ color }} title={label}>
      <Icon className="h-3.5 w-3.5" />
      {percent != null && <span className="font-mono">{percent > 0 ? '+' : ''}{percent}%</span>}
    </span>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider"
      style={{ color: 'var(--color-text-muted)', textAlign: align ?? 'left', whiteSpace: 'nowrap' }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px]" style={{ color: 'var(--color-text-primary)' }}>
      {children}
    </td>
  );
}
