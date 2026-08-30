import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { MotorTabs } from '../motor-tabs';
import { DnaEditor } from './dna-editor';

export const dynamic = 'force-dynamic';

export default async function DnaPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/motor');

  const dna = await aiEngineService.getActiveDna();

  return (
    <PageShell
      title="Arhaval DNA"
      description="Kanalın değişmeyen yazım kimliği. Tüm formatlarda geçerli. Kaydettiğinde yeni bir versiyon oluşur."
    >
      <MotorTabs />
      <DnaEditor
        initialSections={dna?.sections ?? {}}
        version={dna?.version ?? 1}
      />
    </PageShell>
  );
}
