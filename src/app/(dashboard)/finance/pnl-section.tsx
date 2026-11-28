/**
 * Kâr / Zarar — seçili ayın geliri, gideri, neti; önceki ayla fark ve yıl
 * başından beri toplam. Altında gelir ve gider kategori kırılımı.
 * Rakamların tek kaynağı: financeOverviewService.getPnl (transactions defteri).
 */

import { TrendingUp, TrendingDown, Scale, CalendarRange } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SectionHead } from '@/components/dashboard/widgets';
import type { PnlSummary, CategoryAmount } from '@/services/finance-overview.service';

const CARD = 'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]';

function delta(current: number, previous: number, invert = false) {
  const diff = current - previous;
  if (previous === 0 && current === 0) return { text: 'Geçen ay da yok', tone: 'var(--color-text-muted)' };
  const good = invert ? diff <= 0 : diff >= 0;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  return {
    text: `${sign}${formatCurrency(Math.abs(diff))} geçen aya göre`,
    tone: diff === 0 ? 'var(--color-text-muted)' : good ? 'var(--color-success)' : 'var(--color-error)',
  };
}

function Stat({
  label, value, valueTone, note, icon: Icon, iconColor,
}: {
  label: string; value: string; valueTone?: string;
  note: { text: string; tone: string }; icon: typeof Scale; iconColor: string;
}) {
  return (
    <div className={`${CARD} p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-[var(--color-text-secondary)] sm:text-sm">{label}</p>
        <Icon className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" style={{ color: iconColor }} />
      </div>
      <p
        className="mt-2 truncate text-xl font-semibold tracking-tight tabular-nums sm:mt-3 sm:text-[26px]"
        style={{ color: valueTone ?? 'var(--color-text-primary)' }}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] sm:text-xs" style={{ color: note.tone }}>{note.text}</p>
    </div>
  );
}

function Breakdown({ title, rows, total, color }: { title: string; rows: CategoryAmount[]; total: number; color: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <span className="text-sm font-medium tabular-nums text-[var(--color-text-secondary)]">{formatCurrency(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Bu ay kayıt yok</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
            return (
              <li key={r.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--color-text-secondary)]">{r.category}</span>
                  <span className="flex-shrink-0 tabular-nums text-[var(--color-text-primary)]">
                    {formatCurrency(r.amount)}
                    <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">%{pct}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PnlSection({ pnl, monthLabel }: { pnl: PnlSummary; monthLabel: string }) {
  const { current, previous, ytd } = pnl;
  const netTone = current.net >= 0 ? 'var(--color-success)' : 'var(--color-error)';

  return (
    <section>
      <SectionHead title="Kâr / Zarar" chip={monthLabel} />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Stat label="Gelir" value={formatCurrency(current.income)} note={delta(current.income, previous.income)}
          icon={TrendingUp} iconColor="var(--color-success)" />
        <Stat label="Gider" value={formatCurrency(current.expense)} note={delta(current.expense, previous.expense, true)}
          icon={TrendingDown} iconColor="var(--color-error)" />
        <Stat label={current.net >= 0 ? 'Net kâr' : 'Net zarar'} value={formatCurrency(current.net)} valueTone={netTone}
          note={delta(current.net, previous.net)} icon={Scale} iconColor={netTone} />
        <Stat label={`${pnl.month.slice(0, 4)} toplam net`} value={formatCurrency(ytd.net)}
          valueTone={ytd.net >= 0 ? 'var(--color-success)' : 'var(--color-error)'}
          note={{ text: `Gelir ${formatCurrency(ytd.income)} · Gider ${formatCurrency(ytd.expense)}`, tone: 'var(--color-text-muted)' }}
          icon={CalendarRange} iconColor="var(--color-accent)" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Breakdown title="Gelir nereden geldi" rows={pnl.incomeByCategory} total={current.income} color="var(--color-success)" />
        <Breakdown title="Gider nereye gitti" rows={pnl.expenseByCategory} total={current.expense} color="var(--color-error)" />
      </div>
    </section>
  );
}
