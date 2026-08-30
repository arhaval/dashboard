import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { MotorTabs } from './motor-tabs';
import { ScriptList } from './script-list';

export const dynamic = 'force-dynamic';

export default async function MotorPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const [scripts, formats] = await Promise.all([
    aiEngineService.listScripts(),
    aiEngineService.getFormats(),
  ]);
  const keyReady = Boolean(process.env.OPENAI_API_KEY);

  return (
    <PageShell
      title="İçerik Motoru"
      description="Taslak yaz → Arhavalize et → düzenle → final onayla. Onaylı metinler gold standard olarak hafızaya kaydolur."
    >
      <MotorTabs />
      {!keyReady && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-muted)] px-4 py-2.5 text-sm text-[var(--color-warning)]">
          OPENAI_API_KEY tanımlı değil — metin yazıp saklayabilirsin, ama “Arhavalize Et” anahtar eklenene kadar çalışmaz.
        </div>
      )}
      <ScriptList scripts={scripts} formats={formats} />
    </PageShell>
  );
}
