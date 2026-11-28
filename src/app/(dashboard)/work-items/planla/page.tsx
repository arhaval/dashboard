/**
 * Planlı yayınlar — Admin only.
 * Maç programı ayrı tutulmuyor; admin yaklaşan yayınları buradan yayıncıya
 * atar. Yayıncının ana sayfasında "Yaklaşan" olarak görünür ve yayından sonra
 * "Yayını gir" ile iş girişi önceden dolu açılır.
 */

import { redirect } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { clientService } from '@/services/client.service';
import { contentPlanService } from '@/services/content-plan.service';
import { PlanManager } from './plan-manager';

export const dynamic = 'force-dynamic';

export default async function StreamPlansPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const [publishers, clients, plans] = await Promise.all([
    userService.getByRoles(['PUBLISHER']),
    clientService.getAll(),
    contentPlanService.getUpcoming(),
  ]);

  return (
    <PageShell icon={CalendarClock} title="Planlı yayınlar" description="Yaklaşan yayınları yayıncılara ata">
      <PlanManager publishers={publishers} clients={clients} plans={plans.filter((p) => p.content_type === 'STREAM')} />
    </PageShell>
  );
}
