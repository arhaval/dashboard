/** Instagram OAuth callback — exchange code, store long-lived token. */

import { NextResponse } from 'next/server';
import { instagramService } from '@/services/instagram.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('ig_oauth_state='))
    ?.split('=')[1];

  if (url.searchParams.get('error')) {
    return NextResponse.redirect(new URL('/social?instagram=denied', request.url));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/social?instagram=state_error', request.url));
  }

  // Instagram strips the #_ fragment sometimes; the code param is what we need.
  const cleanCode = code.replace(/#_$/, '');
  const redirectUri = `${url.origin}/api/instagram/oauth/callback`;
  const result = await instagramService.exchangeCode(cleanCode, redirectUri);

  const dest = result.ok ? '/social?instagram=connected' : '/social?instagram=exchange_error';
  const res = NextResponse.redirect(new URL(dest, request.url));
  res.cookies.set('ig_oauth_state', '', { maxAge: 0, path: '/' });
  return res;
}
