/**
 * İçerik İstatistikleri
 * Ekip geneli fikir performansı — tutma oranı, görüntülenme, sıralama
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService, specialPostService } from '@/services';
import { StatsClient } from './stats-client';
import type { SpecialPost } from '@/types';

export const dynamic = 'force-dynamic';

export interface LeaderboardEntry {
  userId:         string;
  fullName:       string;
  avatarUrl:      string | null;
  totalSubmitted: number;
  totalApproved:  number;
  totalPublished: number;
  approvalRate:   number;
  totalViews:     number;
  totalLikes:     number;
  totalComments:  number;
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
        totalLikes:     0,
        totalComments:  0,
      });
    }

    const e = map.get(uid)!;
    e.totalSubmitted += 1;

    if (post.status === 'ONAYLANDI' || post.status === 'YAYINLANDI') {
      e.totalApproved += 1;
    }
    if (post.status === 'YAYINLANDI') {
      e.totalPublished += 1;
      e.totalViews    += post.views    || 0;
      e.totalLikes    += post.likes    || 0;
      e.totalComments += post.comments || 0;
    }
  }

  for (const e of map.values()) {
    e.approvalRate = e.totalSubmitted > 0
      ? Math.round((e.totalApproved / e.totalSubmitted) * 100)
      : 0;
  }

  return [...map.values()].sort((a, b) => b.approvalRate - a.approvalRate);
}

export default async function ContentStatsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const allPosts = await specialPostService.getAll();
  const leaderboard = buildLeaderboard(allPosts);

  // Genel özet
  const published = allPosts.filter(p => p.status === 'YAYINLANDI');
  const summary = {
    totalSubmitted: allPosts.length,
    totalPublished: published.length,
    totalViews:     published.reduce((s, p) => s + (p.views    || 0), 0),
    totalLikes:     published.reduce((s, p) => s + (p.likes    || 0), 0),
    overallRate:    allPosts.length > 0
      ? Math.round(
          (allPosts.filter(p => p.status === 'ONAYLANDI' || p.status === 'YAYINLANDI').length
            / allPosts.length) * 100
        )
      : 0,
  };

  return (
    <PageShell
      title="İçerik İstatistikleri"
      description="Ekip geneli fikir performansı ve sıralama"
    >
      <StatsClient
        leaderboard={leaderboard}
        summary={summary}
        currentUserId={currentUser.id}
      />
    </PageShell>
  );
}
