/**
 * İçerik Fikir Havuzu
 * Ekip üyeleri fikir atar, admin onaylar, editör/grafiker atanır
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService, specialPostService } from '@/services';
import { IdeasClient } from './ideas-client';

export const dynamic = 'force-dynamic';

export default async function IdeasPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const [posts, allUsers] = await Promise.all([
    specialPostService.getAll(),
    userService.getAll(),
  ]);

  return (
    <PageShell
      title="İçerik Fikir Havuzu"
      description="Ekip üyeleri fikir paylaşır, admin onaylar, editör ve grafiker atanır"
    >
      <IdeasClient
        posts={posts}
        currentUser={currentUser}
        allUsers={allUsers}
      />
    </PageShell>
  );
}
