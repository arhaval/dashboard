/**
 * Ücretler (Fiyat Listesi) — Admin only
 * Her kişi × müşteri × iş türü (× uzunluk) için fiyat. İş girişinde otomatik
 * uygulanır. Dış ortakta iki rakam: hak ediş + faturalanan (kâr = fark).
 */

import { Coins as PageIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { clientService } from '@/services/client.service';
import { rateCardService } from '@/services/rate-card.service';
import { RateManager } from './rate-manager';
import { RepriceButton } from './reprice-button';

export const dynamic = 'force-dynamic';

export default async function RateCardsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const [users, clients, rates] = await Promise.all([
    userService.getAll(),
    clientService.getAll(true),
    rateCardService.getAll(),
  ]);

  const activeUsers = users.filter((u) => u.is_active);

  return (
    <PageShell icon={PageIcon}
      title="Ücretler"
      description="Her çalışanın iş başına fiyatı. İş girildiğinde otomatik uygulanır; dış ortakta hem hak ediş hem faturalanan tutar girilir."
      actions={<RepriceButton />}
    >
      <RateManager users={activeUsers} clients={clients} rates={rates} />
    </PageShell>
  );
}
