import { NextRequest, NextResponse } from 'next/server';
import { signInOAuthAccount } from '@/lib/oauthAccount';
import { signToken } from '@/lib/auth';
import { getSiteUrl } from '@/lib/accountTokens';
import { isValidOAuthState, oauthCookieOptions, oauthStateCookie, OAUTH_SESSION_COOKIE } from '@/lib/oauth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const SITE_URL = getSiteUrl();
  const stateCookie = oauthStateCookie('google');
  function redirect(path: string) {
    const response = NextResponse.redirect(`${SITE_URL}${path}`);
    response.cookies.set(stateCookie, '', oauthCookieOptions('/api/auth/google/callback', 0));
    return response;
  }

  if (!isValidOAuthState(searchParams.get('state'), request.cookies.get(stateCookie)?.value)) {
    return redirect('/login?error=google_failed');
  }

  if (error || !code) {
    return redirect('/login?error=google_cancelled');
  }

  try {
    const redirectUri = `${SITE_URL}/api/auth/google/callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Get Google user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!userInfoRes.ok) {
      throw new Error('Failed to get Google user info');
    }

    const googleUser = await userInfoRes.json();
    const { email, name, picture, verified_email } = googleUser as { email: string; name: string; picture?: string; verified_email?: boolean };

    if (!email || !verified_email) {
      throw new Error('Google account has no verified email');
    }

    const user = await signInOAuthAccount(email, name || email.split('@')[0], picture || null);

    const token = signToken({ userId: user.id, authVersion: user.authVersion });
    const response = redirect('/auth/callback');
    response.cookies.set(OAUTH_SESSION_COOKIE, token, oauthCookieOptions('/api/auth/session', 60));
    return response;
  } catch (err) {
    console.error('[google-oauth]', err);
    return redirect('/login?error=google_failed');
  }
}
