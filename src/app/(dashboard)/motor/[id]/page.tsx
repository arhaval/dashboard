import { redirect, notFound } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { ScriptEditor } from './script-editor';

export const dynamic = 'force-dynamic';

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const { id } = await params;
  const [script, formats] = await Promise.all([
    aiEngineService.getScript(id),
    aiEngineService.getFormats(),
  ]);
  if (!script) notFound();

  const keyReady = Boolean(process.env.OPENAI_API_KEY);

  return (
    <PageShell title={script.title} description="Taslak → Arhavalize → düzenle → final onayla">
      <ScriptEditor script={script} formats={formats} keyReady={keyReady} />
    </PageShell>
  );
}
