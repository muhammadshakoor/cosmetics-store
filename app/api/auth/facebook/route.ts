import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/accountTokens';
import { createOAuthState, oauthCookieOptions, oauthStateCookie } from '@/lib/oauth';

export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ message: 'Facebook OAuth not configured' }, { status: 500 });
  }

  const SITE_URL = getSiteUrl();
  const redirectUri = `${SITE_URL}/api/auth/facebook/callback`;
  const state = createOAuthState();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'email,public_profile',
    response_type: 'code',
    state,
  });

  const response = NextResponse.redirect(
    `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
  );
  response.cookies.set(oauthStateCookie('facebook'), state, oauthCookieOptions('/api/auth/facebook/callback', 600));
  return response;
}
