/**
 * Müşteriler / İş Ortakları — Admin only
 * Arhaval (iç iş) + dış ortaklar (Sangal vb.). Fiyatlandırma buna göre.
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { clientService } from '@/services/client.service';
import { ClientsManager } from './clients-manager';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const clients = await clientService.getAll(true);

  return (
    <PageShell
      title="Ekstra İşler"
      description="Dış ortaklar için yapılan ekstra işler (Sangal gibi). İş girişinde buradan seçilir, fiyat buna göre belirlenir."
    >
      <ClientsManager clients={clients} />
    </PageShell>
  );
}
