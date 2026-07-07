/**
 * Start the YouTube Analytics OAuth flow (admin only).
 * Redirects the admin to Google's consent screen.
 */

import { NextResponse } from 'next/server';
import { userService } from '@/services';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!process.env.YOUTUBE_OAUTH_CLIENT_ID || !process.env.YOUTUBE_OAUTH_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/social?youtube=env_missing', request.url));
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/youtube/oauth/callback`;
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const res = NextResponse.redirect(youtubeAnalyticsService.authUrl(redirectUri, state));
  res.cookies.set('yt_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
