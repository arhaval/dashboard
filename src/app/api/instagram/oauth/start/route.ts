/** Start the Instagram OAuth flow (admin only). */

import { NextResponse } from 'next/server';
import { userService } from '@/services';
import { instagramService } from '@/services/instagram.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
    return NextResponse.redirect(new URL('/social?instagram=env_missing', request.url));
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/instagram/oauth/callback`;
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const res = NextResponse.redirect(instagramService.authUrl(redirectUri, state));
  res.cookies.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
