/**
 * İçerik Fikir Havuzu
 * Admin: tüm içerikler + yönetim
 * Diğerleri: sadece kendi fikirleri + yarış tablosu
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService, specialPostService } from '@/services';
import { IdeasClient } from './ideas-client';
import type { SpecialPost } from '@/types';

export const dynamic = 'force-dynamic';

export interface LeaderboardEntry {
  userId:         string;
  fullName:       string;
  avatarUrl:      string | null;
  totalSubmitted: number;
  totalApproved:  number;   // ONAYLANDI + YAYINLANDI
  totalPublished: number;   // sadece YAYINLANDI
  approvalRate:   number;   // (approved / submitted) * 100
  totalViews:     number;   // yayınlanan içeriklerin toplam görüntülenmesi
}

function buildLeaderboard(allPosts: SpecialPost[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();

  for (const post of allPosts) {
    if (!post.author) continue;
    const uid = post.author.id;

    if (!map.has(uid)) {
      map.set(uid, {
        userId:         uid,
        fullName:       post.author.full_name,
        avatarUrl:      post.author.avatar_url,
        totalSubmitted: 0,
        totalApproved:  0,
        totalPublished: 0,
        approvalRate:   0,
        totalViews:     0,
      });
    }

    const entry = map.get(uid)!;
    entry.totalSubmitted += 1;

    if (post.status === 'ONAYLANDI' || post.status === 'YAYINLANDI') {
      entry.totalApproved += 1;
    }
    if (post.status === 'YAYINLANDI') {
      entry.totalPublished += 1;
      entry.totalViews     += post.views || 0;
    }
  }

  // approvalRate hesapla
  for (const entry of map.values()) {
    entry.approvalRate = entry.totalSubmitted > 0
      ? Math.round((entry.totalApproved / entry.totalSubmitted) * 100)
      : 0;
  }

  // Tutma oranına göre sırala
  return [...map.values()].sort((a, b) => b.approvalRate - a.approvalRate);
}

export default async function IdeasPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';

  // Admin: tüm postlar | Diğerleri: sadece kendi postları
  const [myPosts, allPostsForLeaderboard, allUsers] = await Promise.all([
    isAdmin
      ? specialPostService.getAll()
      : specialPostService.getAll({ author_id: currentUser.id }),
    specialPostService.getAll(), // leaderboard için her zaman hepsi
    userService.getAll(),
  ]);

  const leaderboard = buildLeaderboard(allPostsForLeaderboard);

  return (
    <PageShell
      title="İçerik Fikir Havuzu"
      description="Fikir gönder, onay oranını takip et, sıralamada yüksel"
    >
      <IdeasClient
        posts={myPosts}
        currentUser={currentUser}
        allUsers={allUsers}
        leaderboard={leaderboard}
      />
    </PageShell>
  );
}
