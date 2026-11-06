import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, toClient } from '@/lib/auth';
import { getSiteUrl } from '@/lib/accountTokens';
import { oauthCookieOptions, OAUTH_SESSION_COOKIE } from '@/lib/oauth';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== getSiteUrl()) return NextResponse.json({ message: 'Invalid sign-in request.' }, { status: 403 });
  const token = request.cookies.get(OAUTH_SESSION_COOKIE)?.value;
  const response = await (async () => {
    if (!token) return NextResponse.json({ message: 'Sign-in expired. Please try again.' }, { status: 401 });
    const authenticatedRequest = new NextRequest(request.url, { headers: { Authorization: `Bearer ${token}` } });
    const user = await getAuthUser(authenticatedRequest);
    if (!user) return NextResponse.json({ message: 'Sign-in expired. Please try again.' }, { status: 401 });
    return NextResponse.json({ ...toClient(user), token });
  })();
  response.cookies.set(OAUTH_SESSION_COOKIE, '', oauthCookieOptions('/api/auth/session', 0));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
