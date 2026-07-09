import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { permissionService } from '@/services/permission.service';
import { PermissionsMatrix } from './permissions-matrix';

export const dynamic = 'force-dynamic';

export default async function YetkilerPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const matrix = await permissionService.getMatrix();

  return (
    <PageShell
      title="Roller & Yetkiler"
      description="Her rolün hangi sayfalara erişebileceğini buradan aç/kapa. Yönetici her zaman tam erişime sahiptir ve değiştirilemez."
    >
      <PermissionsMatrix matrix={matrix} />
    </PageShell>
  );
}
