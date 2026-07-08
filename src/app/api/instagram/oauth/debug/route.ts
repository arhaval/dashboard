/**
 * TEMP debug: raw Instagram account-insights response for a month, so we can
 * verify the exact metric names. Admin only.
 * Usage: /api/instagram/oauth/debug?month=2026-06
 */

import { NextResponse } from 'next/server';
import { userService } from '@/services';
import { instagramService } from '@/services/instagram.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month') || '2026-06';

  const auth = await instagramService.getValidToken();
  if (!auth) return NextResponse.json({ error: 'bağlı değil / token yok' });

  const [y, m] = month.split('-').map(Number);
  const since = Math.floor(new Date(y, m - 1, 1).getTime() / 1000);
  let until = Math.floor(new Date(y, m, 1).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  if (until > now) until = now;

  const graph = 'https://graph.instagram.com';
  const me = await (await fetch(`${graph}/me?fields=user_id,username,followers_count,media_count&access_token=${auth.token}`)).json();
  const igId = me.user_id ? String(me.user_id) : auth.igUserId;
  const insightsUrl =
    `${graph}/${igId}/insights?metric=views,likes,comments,saved,shares` +
    `&metric_type=total_value&period=day&since=${since}&until=${until}&access_token=${auth.token}`;
  const insights = await (await fetch(insightsUrl)).json();

  return NextResponse.json({ month, resolvedUserId: igId, me, insights });
}
