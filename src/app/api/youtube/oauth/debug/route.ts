/**
 * TEMP debug: returns the raw YouTube Analytics reports.query response for a
 * month so we can see the exact creatorContentType values. Admin only.
 * Usage: /api/youtube/oauth/debug?month=2026-06
 */

import { NextResponse } from 'next/server';
import { userService } from '@/services';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month') || '2026-06';
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;

  const accessToken = await youtubeAnalyticsService.getAccessToken();
  if (!accessToken) return NextResponse.json({ error: 'no access token (bağlı değil?)' });

  const q =
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE` +
    `&startDate=${start}&endDate=${end}&metrics=views,likes,comments&dimensions=creatorContentType`;
  const res = await fetch(q, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();

  return NextResponse.json({ ok: res.ok, status: res.status, month, start, end, data });
}
