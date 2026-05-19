/**
 * İçerik Fikir Havuzu
 * Admin: tüm içerikler + yönetim
 * Diğerleri: sadece kendi fikirleri + yarış tablosu
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService, specialPostService } from '@/services';
import { IdeasClient } from './ideas-client';

export const dynamic = 'force-dynamic';


export default async function IdeasPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';

  // Admin: tüm postlar | Diğerleri: sadece kendi postları
  const [myPosts, allUsers] = await Promise.all([
    isAdmin
      ? specialPostService.getAll()
      : specialPostService.getAll({ author_id: currentUser.id }),
    userService.getAll(),
  ]);

  return (
    <PageShell
      title="İçerik Fikir Havuzu"
      description="Fikir gönder, onay oranını takip et, sıralamada yüksel"
    >
      <IdeasClient
        posts={myPosts}
        currentUser={currentUser}
        allUsers={allUsers}
      />
    </PageShell>
  );
}
