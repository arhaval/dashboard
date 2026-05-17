'use client';

import { useState, useTransition } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, Calendar,
  CheckCircle2, XCircle, Plus, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { AddEntryModal } from './add-entry-modal';
import {
  markIncomeReceivedAction,
  markExpensePaidAction,
  cancelIncomeAction,
  cancelExpenseAction,
} from './actions';
import type { CashFlowSummary, ExpectedIncome, ExpectedExpense, MonthlyPoint } from '@/services/cash-flow.service';
import { formatCurrency } from '@/lib/utils';

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function relDate(dateStr: string) {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return { label: `${Math.abs(days)}g gecikti`, color: 'var(--color-error)'   };
  if (days === 0) return { label: 'Bugün',                       color: 'var(--color-warning)'  };
  if (days <= 7)  return { label: `${days}g kaldı`,              color: 'var(--color-warning)'  };
  return          { label: `${days}g kaldı`,                     color: 'var(--color-text-muted)' };
}

const CAT: Record<string, string> = {
  SPONSORLUK: 'Sponsorluk', REKLAM: 'Reklam', TURNUVA: 'Turnuva', DIGER: 'Diğer',
};

// ── Özet Kart ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border p-5 flex flex-col gap-3"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="text-3xl font-bold tracking-tight" style={{ color }}>{value}</div>
      {sub && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Gelir Satırı ──────────────────────────────────────────────────────────────

function IncomeRow({ row }: { row: ExpectedIncome }) {
  const [pending, start] = useTransition();
  const rd = relDate(row.expected_date);

  return (
    <div className="flex items-center gap-4 py-3 border-b group last:border-0"
      style={{ borderColor: 'var(--color-border)' }}>
      <div className="w-16 flex-shrink-0 text-center">
        <div className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {new Date(row.expected_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
        </div>
        <div className="text-[10px] mt-0.5 font-medium" style={{ color: rd.color }}>
          {rd.label}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {row.title}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {CAT[row.category] ?? row.category}
          {row.notes && (
            <> <span style={{ color: 'var(--color-border)' }}>·</span> <span className="italic">{row.notes}</span></>
          )}
        </div>
      </div>

      <div className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--color-success)' }}>
        {formatCurrency(row.amount)}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button disabled={pending}
          onClick={() => start(() => markIncomeReceivedAction(row.id))}
          title="Tahsil Edildi → Finance'a yazar"
          className="p-1.5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
          style={{ color: 'var(--color-success)' }}>
          <CheckCircle2 size={15} />
        </button>
        <button disabled={pending}
          onClick={() => start(() => cancelIncomeAction(row.id))}
          title="İptal"
          className="p-1.5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
          style={{ color: 'var(--color-text-muted)' }}>
          <XCircle size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Gider Satırı ──────────────────────────────────────────────────────────────

function ExpenseRow({ row }: { row: ExpectedExpense }) {
  const [pending, start] = useTransition();
  const rd = relDate(row.due_date);

  return (
    <div className="flex items-center gap-4 py-3 border-b group last:border-0"
      style={{ borderColor: 'var(--color-border)' }}>
      <div className="w-16 flex-shrink-0 text-center">
        <div className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {new Date(row.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
        </div>
        <div className="text-[10px] mt-0.5 font-medium" style={{ color: rd.color }}>
          {rd.label}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {row.title}
        </div>
        <div className="text-[11px] mt-0.5 italic" style={{ color: 'var(--color-text-muted)' }}>
          {row.category}
          {row.notes && (
            <> <span style={{ color: 'var(--color-border)' }}>·</span> {row.notes}</>
          )}
        </div>
      </div>

      <div className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--color-error)' }}>
        {formatCurrency(row.amount)}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button disabled={pending}
          onClick={() => start(() => markExpensePaidAction(row.id))}
          title="Ödendi → Finance'a yazar"
          className="p-1.5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
          style={{ color: 'var(--color-success)' }}>
          <CheckCircle2 size={15} />
        </button>
        <button disabled={pending}
          onClick={() => start(() => cancelExpenseAction(row.id))}
          title="İptal"
          className="p-1.5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
          style={{ color: 'var(--color-text-muted)' }}>
          <XCircle size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Aylık Bar ─────────────────────────────────────────────────────────────────

function MonthlyChart({ points }: { points: MonthlyPoint[] }) {
  const maxVal = Math.max(...points.flatMap((p) => [p.income, p.expense]), 1);

  return (
    <div className="grid grid-cols-6 gap-2 items-end" style={{ height: '112px' }}>
      {points.map((p) => {
        const incH = Math.round((p.income  / maxVal) * 80);
        const expH = Math.round((p.expense / maxVal) * 80);
        return (
          <div key={p.month} className="flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-[var(--radius-md)]
              px-2 py-1.5 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 z-10
              pointer-events-none transition-opacity space-y-0.5"
              style={{ background: 'var(--color-sidebar-bg)', color: '#fff' }}>
              <div style={{ color: 'var(--color-success)' }}>+{formatCurrency(p.income)}</div>
              <div style={{ color: 'var(--color-error)' }}>-{formatCurrency(p.expense)}</div>
              <div style={{ color: p.net >= 0 ? 'var(--color-info)' : 'var(--color-error)' }}>
                Net: {formatCurrency(p.net)}
              </div>
            </div>
            <div className="flex gap-0.5 items-end w-full px-0.5" style={{ height: '80px' }}>
              <div className="flex-1 rounded-t transition-all"
                style={{ height: `${incH}%`, minHeight: incH ? 2 : 0, background: 'var(--color-success)' }} />
              <div className="flex-1 rounded-t transition-all"
                style={{ height: `${expH}%`, minHeight: expH ? 2 : 0, background: 'var(--color-error)' }} />
            </div>
            <span className="text-[10px] text-center leading-tight"
              style={{ color: 'var(--color-text-muted)' }}>{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--color-text-muted)' }}>
      <Calendar size={28} strokeWidth={1.5} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export function CashFlowClient({ data }: { data: CashFlowSummary }) {
  const [tab, setTab]     = useState<'income' | 'expense'>('income');
  const [modal, setModal] = useState(false);
  const pos = data.projectedBalance >= 0;

  const tabs = [
    { key: 'income'  as const, label: 'Beklenen Gelirler', count: data.pendingIncomes.length,  icon: <TrendingUp  size={14} />, color: 'var(--color-success)' },
    { key: 'expense' as const, label: 'Bekleyen Giderler', count: data.pendingExpenses.length, icon: <TrendingDown size={14} />, color: 'var(--color-error)'   },
  ];

  return (
    <>
      <AddEntryModal open={modal} onClose={() => setModal(false)} />

      <div className="space-y-5">

        {/* Yeni Kayıt butonu — sağ üst (PageShell actions slotuna geçirilecek) */}
        <div className="flex justify-end">
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}>
            <Plus size={15} /> Yeni Kayıt
          </button>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Beklenen Gelir"
            value={formatCurrency(data.totalExpectedIncome)}
            sub={`${data.pendingIncomes.length} kayıt bekliyor`}
            icon={<TrendingUp size={20} />}
            color="var(--color-success)"
          />
          <StatCard
            label="Bekleyen Gider"
            value={formatCurrency(data.totalExpectedExpense)}
            sub={`${data.pendingExpenses.length} ödeme planlandı`}
            icon={<TrendingDown size={20} />}
            color="var(--color-error)"
          />
          <StatCard
            label="Tahmini Dönem Sonu"
            value={formatCurrency(data.projectedBalance)}
            sub={pos ? 'Pozitif tahmini bakiye' : '⚠ Dikkat: açık pozisyon'}
            icon={<Wallet size={20} />}
            color={pos ? 'var(--color-info)' : 'var(--color-warning)'}
          />
        </div>

        {/* Bu ay gerçekleşen */}
        {(data.currentMonthIncome > 0 || data.currentMonthExpense > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Bu Ay Tahsil Edildi', val: data.currentMonthIncome,  icon: <ArrowUpRight   size={16} />, color: 'var(--color-success)' },
              { label: 'Bu Ay Ödendi',         val: data.currentMonthExpense, icon: <ArrowDownRight size={16} />, color: 'var(--color-error)'   },
            ].map((item) => (
              <div key={item.label}
                className="rounded-[var(--radius-lg)] border px-4 py-3 flex items-center gap-3"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div style={{ color: item.color }}>{item.icon}</div>
                <div>
                  <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.label}
                  </div>
                  <div className="text-lg font-bold" style={{ color: item.color }}>
                    {formatCurrency(item.val)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aylık projeksiyon */}
        <div className="rounded-[var(--radius-lg)] border p-5"
          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Aylık Projeksiyon (6 ay)
            </h2>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--color-success)' }} />
                Gelir
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--color-error)' }} />
                Gider
              </span>
            </div>
          </div>
          {data.monthlyProjection.every((p) => p.income === 0 && p.expense === 0) ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>
              Henüz kayıt yok — &ldquo;Yeni Kayıt&rdquo; ile ekle.
            </p>
          ) : (
            <MonthlyChart points={data.monthlyProjection} />
          )}
        </div>

        {/* Listeler */}
        <div className="rounded-[var(--radius-lg)] border overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          {/* Sekme başlıkları */}
          <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  color: tab === t.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                  background: 'transparent',
                }}>
                <span style={{ color: t.color }}>{t.icon}</span>
                {t.label}
                {t.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: t.color + '22', color: t.color }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === 'income' && (
              data.pendingIncomes.length === 0
                ? <Empty label="Bekleyen gelir kaydı yok" />
                : data.pendingIncomes.map((r) => <IncomeRow key={r.id} row={r} />)
            )}
            {tab === 'expense' && (
              data.pendingExpenses.length === 0
                ? <Empty label="Bekleyen gider kaydı yok" />
                : data.pendingExpenses.map((r) => <ExpenseRow key={r.id} row={r} />)
            )}
          </div>
        </div>

        <p className="text-xs text-center pb-2" style={{ color: 'var(--color-text-muted)' }}>
          ✓ butonu → tahsil/ödeme Finance sayfasına otomatik yansır
        </p>
      </div>
    </>
  );
}
