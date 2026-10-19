import { redirect, notFound } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { contentQueueService } from '@/services/content-queue.service';
import { ScriptEditor } from './script-editor';

export const dynamic = 'force-dynamic';

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const { id } = await params;
  const [script, formats, voiceRows, handoffs] = await Promise.all([
    aiEngineService.getScript(id),
    aiEngineService.getFormats(),
    // İçerik Planı ile aynı liste: seslendirmen + yayıncı teslim alabilir.
    userService.getByRoles(['VOICE', 'PUBLISHER']),
    contentQueueService.getHandoffsForScripts([id]),
  ]);
  if (!script) notFound();

  const keyReady = Boolean(process.env.OPENAI_API_KEY);
  const voicePeople = voiceRows.map((u) => ({ id: u.id, name: u.full_name }));

  return (
    <PageShell title={script.title} description="Taslak → Arhavalize → düzenle → final onayla">
      <ScriptEditor
        script={script}
        formats={formats}
        keyReady={keyReady}
        voicePeople={voicePeople}
        handoff={handoffs[id] ?? null}
      />
    </PageShell>
  );
}
