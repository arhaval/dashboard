/**
 * Daily Fikir Havuzu reminder (Vercel Cron).
 * Smart, not spammy: a user is only pinged if there are OPEN ideas they
 * haven't voted on yet. Admins get a "waiting on your decision" wording.
 * If CRON_SECRET is set, the request must carry `Authorization: Bearer <secret>`.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { notificationService } from '@/services/notification.service';
import { denyCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  const admin = createAdminClient();

  const { data: ideaRows } = await admin.from('ideas').select('id').eq('status', 'OPEN');
  const openIds = (ideaRows ?? []).map((i: { id: string }) => i.id);
  if (openIds.length === 0) {
    return Response.json({ sent: 0, reason: 'Açık fikir yok' });
  }

  const { data: voteRows } = await admin
    .from('idea_votes')
    .select('idea_id, voter_id')
    .in('idea_id', openIds);

  const votedByUser = new Map<string, Set<string>>();
  for (const v of (voteRows ?? []) as { idea_id: string; voter_id: string }[]) {
    const set = votedByUser.get(v.voter_id) ?? new Set<string>();
    set.add(v.idea_id);
    votedByUser.set(v.voter_id, set);
  }

  const { data: userRows } = await admin.from('users').select('id, role').eq('is_active', true);

  let sent = 0;
  for (const u of (userRows ?? []) as { id: string; role: string }[]) {
    const voted = votedByUser.get(u.id) ?? new Set<string>();
    const pending = openIds.filter((id) => !voted.has(id)).length;
    if (pending === 0) continue;

    const isAdmin = u.role === 'ADMIN';
    await notificationService.notify({
      userIds: [u.id],
      title: '💡 Fikir Havuzu',
      body: isAdmin
        ? `${pending} fikir kararını bekliyor. Değerlendirip onayla ya da reddet.`
        : `${pending} fikre henüz oy vermedin. Bir uğra, görüşünü bırak.`,
      url: '/fikir-havuzu',
      tag: 'idea-digest', // one digest per user; replaces yesterday's
    });
    sent += 1;
  }

  return Response.json({ sent, openIdeas: openIds.length });
}
