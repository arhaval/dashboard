/**
 * Nakit Akışı Tahmini Sayfası
 * Beklenen gelir/gider takibi ve projeksiyon — Admin only
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { cashFlowService, userService } from '@/services';
import { FinanceHubTabs } from '../finance/finance-hub-tabs';
import { CashFlowClient } from './cash-flow-client';

export const dynamic = 'force-dynamic';

export default async function NakitPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const data = await cashFlowService.getSummary();

  return (
    <PageShell
      title="Nakit Akışı Tahmini"
      description="Sözleşmeli ama henüz hesaba geçmemiş gelirler ve planlanmış giderler"
    >
      <FinanceHubTabs />
      <CashFlowClient data={data} />
    </PageShell>
  );
}
