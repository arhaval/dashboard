import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { MotorTabs } from '../motor-tabs';
import { FormatEditor } from './format-editor';

export const dynamic = 'force-dynamic';

export default async function FormatlarPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/motor');

  const formats = await aiEngineService.getFormats();

  return (
    <PageShell
      title="Format Playbook"
      description="Her içerik türünün kendi hook, gövde, ritim, kanıt, payoff ve CTA kuralları. DNA’nın üstüne, formata özel katman."
    >
      <MotorTabs />
      <FormatEditor formats={formats} />
    </PageShell>
  );
}
