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
  const stateCookie = oauthStateCookie('facebook');
  function redirect(path: string) {
    const response = NextResponse.redirect(`${SITE_URL}${path}`);
    response.cookies.set(stateCookie, '', oauthCookieOptions('/api/auth/facebook/callback', 0));
    return response;
  }

  if (!isValidOAuthState(searchParams.get('state'), request.cookies.get(stateCookie)?.value)) {
    return redirect('/login?error=facebook_failed');
  }

  if (error || !code) {
    return redirect('/login?error=facebook_cancelled');
  }

  try {
    const redirectUri = `${SITE_URL}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!);
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET!);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString(), { signal: AbortSignal.timeout(10000) });
    if (!tokenRes.ok) throw new Error('Failed to exchange code for token');
    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Get Facebook user info including profile picture
    const userInfoRes = await fetch(
      'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)',
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!userInfoRes.ok) throw new Error('Failed to get Facebook user info');
    const fbUser = await userInfoRes.json();

    const { name, email, id: fbId } = fbUser as { name: string; email?: string; id?: string };
    const picture: string | null = fbId
      ? `https://graph.facebook.com/${fbId}/picture?type=large`
      : null;

    // Facebook may not return email if user hasn't granted it or has no email
    if (!email) {
      return redirect('/login?error=facebook_no_email');
    }

    const user = await signInOAuthAccount(email, name || email.split('@')[0], picture || null);

    const token = signToken({ userId: user.id, authVersion: user.authVersion });
    const response = redirect('/auth/callback');
    response.cookies.set(OAUTH_SESSION_COOKIE, token, oauthCookieOptions('/api/auth/session', 60));
    return response;
  } catch (err) {
    console.error('[facebook-oauth]', err);
    return redirect('/login?error=facebook_failed');
  }
}
