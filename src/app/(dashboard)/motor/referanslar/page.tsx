import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { MotorTabs } from '../motor-tabs';
import { ReferenceManager } from './reference-manager';

export const dynamic = 'force-dynamic';

export default async function ReferanslarPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/motor');

  const [references, formats] = await Promise.all([
    aiEngineService.getReferences(),
    aiEngineService.getFormats(),
  ]);

  return (
    <PageShell
      title="Referans Kütüphanesi"
      description="Bize ait olmayan, yalnız stil/ritim analizi için kullanılan SRT ve metinler. Gold standard SAYILMAZ; üretimde stil örneği olarak getirilir."
    >
      <MotorTabs />
      <ReferenceManager references={references} formats={formats} />
    </PageShell>
  );
}
