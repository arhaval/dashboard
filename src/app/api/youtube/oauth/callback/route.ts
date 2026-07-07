/**
 * YouTube Analytics OAuth callback.
 * Google redirects here with ?code=...; we verify state, exchange the code for
 * a refresh token, persist it, and bounce back to the Social page.
 */

import { NextResponse } from 'next/server';
import { youtubeAnalyticsService } from '@/services/youtube-analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('yt_oauth_state='))
    ?.split('=')[1];

  if (url.searchParams.get('error')) {
    return NextResponse.redirect(new URL('/social?youtube=denied', request.url));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/social?youtube=state_error', request.url));
  }

  const redirectUri = `${url.origin}/api/youtube/oauth/callback`;
  const result = await youtubeAnalyticsService.exchangeCode(code, redirectUri);

  const dest = result.ok ? '/social?youtube=connected' : '/social?youtube=exchange_error';
  const res = NextResponse.redirect(new URL(dest, request.url));
  res.cookies.set('yt_oauth_state', '', { maxAge: 0, path: '/' });
  return res;
}
