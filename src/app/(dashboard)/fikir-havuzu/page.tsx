import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { ideaService } from '@/services/idea.service';
import { IdeaBoard } from './idea-board';

export const dynamic = 'force-dynamic';

export default async function FikirHavuzuPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');

  const ideas = await ideaService.getAllForUser({ id: user.id, role: user.role });
  const isAdmin = user.role === 'ADMIN';
  const commentsEnabled = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <PageShell
      title="Fikir Havuzu"
      description="Ekip fikir atar ve oylar; AI değerlendirir; admin İçerik Planı'na aktarır. Yazar ve oy kırılımı yalnız adminde görünür."
    >
      <IdeaBoard ideas={ideas} isAdmin={isAdmin} commentsEnabled={commentsEnabled} />
    </PageShell>
  );
}
