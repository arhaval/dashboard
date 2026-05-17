/**
 * Sosyal Medya Yönetimi
 * Rol bazlı: İçerik Üretici → kendi dashboard'u | Admin → onay + analitik
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService, specialPostService } from '@/services';
import { getCreatorDashboardData } from '@/app/actions/social-actions';
import { CreatorView } from './creator-view';
import { AdminView } from './admin-view';

export const dynamic = 'force-dynamic';

export default async function SosyalMedyaPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';

  if (isAdmin) {
    const [allPosts, allUsers] = await Promise.all([
      specialPostService.getAll(),
      userService.getAll(),
    ]);

    return (
      <PageShell
        title="Sosyal Medya Yönetimi"
        description="Fikir onaylama, ekip atama ve genel analitik ekranı"
      >
        <AdminView allPosts={allPosts} allUsers={allUsers} />
      </PageShell>
    );
  }

  // İçerik üretici / diğer roller
  const [creatorData, allMyPosts, poolPosts] = await Promise.all([
    getCreatorDashboardData(currentUser.id),
    specialPostService.getAll({ author_id: currentUser.id }),
    specialPostService.getAll({ status: 'ONAYLANDI' }),
  ]);

  return (
    <PageShell
      title="Sosyal Medya"
      description="İçeriklerinizin performansı ve yeni fikir önerisi"
    >
      <CreatorView
        currentUser={currentUser}
        dashboardData={creatorData}
        allPosts={allMyPosts}
        poolPosts={poolPosts}
      />
    </PageShell>
  );
}
