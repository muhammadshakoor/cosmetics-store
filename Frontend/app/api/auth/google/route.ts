import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/accountTokens';
import { createOAuthState, oauthCookieOptions, oauthStateCookie } from '@/lib/oauth';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ message: 'Google OAuth not configured' }, { status: 500 });
  }

  const SITE_URL = getSiteUrl();
  const redirectUri = `${SITE_URL}/api/auth/google/callback`;
  const state = createOAuthState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
  response.cookies.set(oauthStateCookie('google'), state, oauthCookieOptions('/api/auth/google/callback', 600));
  return response;
}
