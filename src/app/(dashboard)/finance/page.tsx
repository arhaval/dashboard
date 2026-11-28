/**
 * Finans — Admin only.
 * Yöneticinin sırasıyla sorduğu üç soru:
 *   1. Bu ay kâr mı zarar mı?          → PnlSection (ay / önceki ay / yıl)
 *   2. Kime borçluyuz, bize kim borçlu? → DebtsSection (ekip, dış ortak, sponsor)
 *   3. Para nereye gitti?               → trend + hareketler tablosu
 * Ödemeler ve Nakit Akışı aynı başlık altında sekme olarak kalır.
 */

import { PiggyBank as PageIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Pager } from '@/components/ui/pager';
import { paginate, parsePage } from '@/lib/paginate';
import { MonthlyTrendChart } from '@/components/charts/finance-charts';
import { SectionHead } from '@/components/dashboard/widgets';
import { TR_MONTHS } from '@/components/dashboard/utils';
import { financeService, userService } from '@/services';
import { getNextMonthStart } from '@/services/finance.service';
import { financeOverviewService } from '@/services/finance-overview.service';
import { currentMonthTR } from '@/lib/utils/dates';
import { TRANSACTION_TYPES } from '@/constants';
import type { TransactionType } from '@/types';
import { FinanceFilters } from './filters';
import { FinanceHubTabs } from './finance-hub-tabs';
import { FinanceMonthPicker } from './month-picker';
import { FinanceExportButtons } from './export-buttons';
import { PnlSection } from './pnl-section';
import { DebtsSection } from './debts-section';
import { TransactionsTable } from './transactions-table';

const TREND_MONTHS = 6;

interface PageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    month?: string;
    sayfa?: string;
  }>;
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return `${TR_MONTHS[m - 1]} ${y}`;
}

export default async function FinancePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  // Varsayılan: içinde bulunulan ay (Türkiye saatiyle) — "son kayıtlı ay" değil.
  const thisMonth = currentMonthTR();
  const recorded = await financeService.getAvailableMonths();
  const months = recorded.includes(thisMonth) ? recorded : [thisMonth, ...recorded];
  const activeMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : thisMonth;

  const filters: { type?: TransactionType; category?: string; date_from: string; date_before: string } = {
    date_from: `${activeMonth}-01`,
    date_before: getNextMonthStart(activeMonth),
  };
  if (params.type && (TRANSACTION_TYPES as readonly string[]).includes(params.type)) {
    filters.type = params.type as TransactionType;
  }
  if (params.category) filters.category = params.category;

  const [pnl, payables, receivables, transactions, stats, categories, trend] = await Promise.all([
    financeOverviewService.getPnl(activeMonth),
    financeOverviewService.getPayables(),
    financeOverviewService.getReceivables(),
    financeService.getAll(filters),
    financeService.getStatsByMonth(activeMonth),
    financeService.getCategories(),
    financeService.getMonthlyTrend(TREND_MONTHS),
  ]);

  // Yalnızca tablo sayfalanır; dışa aktarma ayın tüm kayıtlarıyla çalışır.
  const paged = paginate(transactions, parsePage(params.sayfa));

  return (
    <PageShell
      icon={PageIcon}
      title="Finans"
      description="Kâr/zarar, borçlar, alacaklar ve tüm hareketler"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <FinanceExportButtons transactions={transactions} stats={stats} currentMonth={activeMonth} />
          <FinanceMonthPicker months={months} currentMonth={activeMonth} />
        </div>
      }
    >
      <FinanceHubTabs />

      <div className="space-y-8">
        <PnlSection pnl={pnl} monthLabel={monthLabel(activeMonth)} />

        <DebtsSection payables={payables} receivables={receivables} />

        <section>
          <SectionHead title="Son 6 ay" chip="Gelir / gider" />
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <MonthlyTrendChart data={trend.map((d) => ({ month: d.label, income: d.income, expense: d.expense }))} />
          </div>
        </section>

        <section>
          <SectionHead title={`Hareketler · ${monthLabel(activeMonth)}`} />
          <FinanceFilters
            currentType={params.type}
            currentCategory={params.category}
            currentMonth={activeMonth}
            categories={categories}
          />
          <div className="mt-4">
            <TransactionsTable transactions={paged.rows} />
            <Pager paged={paged} basePath="/finance" params={params} label="kayı" />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
