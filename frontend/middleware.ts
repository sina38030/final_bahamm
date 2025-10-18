import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Disable caching for payment success pages to avoid stale HTML after deploys
  if (pathname === '/payment/success' || pathname.startsWith('/payment/success/')) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  }

  // Only handle payment callback, not other routes
  if (pathname === '/payment/callback') {
    const authority = url.searchParams.get('Authority') || url.searchParams.get('authority');
    const status = (url.searchParams.get('Status') || url.searchParams.get('status') || '').toUpperCase();

    console.log('[Middleware] Callback request:', { pathname, authority, status });

    // For successful payments, let the callback page handle the logic
    // Don't redirect here - let the client-side code decide based on localStorage
    if (authority && status === 'OK') {
      console.log('[Middleware] Successful payment callback - letting client handle routing');
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/payment/callback', '/payment/success', '/payment/success/:path*'],
};


