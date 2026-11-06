import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authCookie = request.cookies.get('lumina_auth')?.value;
  const adminCookie = request.cookies.get('lumina_admin')?.value;

  // 1. Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    if (!authCookie || !adminCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Customer pages (/profile, /checkout, /complaints/my) are deliberately NOT redirected here.
  // The lumina_auth cookie is only a browser-set hint, and Next.js caches prefetched middleware
  // redirects, which sent signed-in customers to the login page. Those pages check the real
  // session themselves (useAuth + authReady) and their APIs verify the token on the server.

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

