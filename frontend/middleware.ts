import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Redirect legacy path to the correct invitee success page
  if (pathname === '/payment/success/invite' || pathname === '/payment/success/invite/') {
    const redirectUrl = new URL(req.url);
    redirectUrl.pathname = '/payment/success/invitee';
    return NextResponse.redirect(redirectUrl);
  }

  // Apply no-store for Telegram-sensitive HTML pages to avoid stale cached HTML -> missing chunks.
  // Some Android Telegram WebViews can ignore a plain reload and keep serving cached documents,
  // so we also rely on cache-busting navigation (see ChunkErrorReload + inline head script).
  const shouldNoStore =
    pathname === '/chat' ||
    pathname === '/groups-orders' ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/payment/success' ||
    pathname.startsWith('/payment/success/');

  // Only handle payment callback, not other routes
  if (pathname === '/payment/callback') {
    const authority = url.searchParams.get('Authority') || url.searchParams.get('authority');
    const status = (url.searchParams.get('Status') || url.searchParams.get('status') || '').toUpperCase();

    console.log('[Middleware] Callback request:', { pathname, authority, status });

    // For successful payments, let the callback page handle the logic
    // Don't redirect here - let the client-side code decide based on localStorage
    if (authority && status === 'OK') {
      console.log('[Middleware] Successful payment callback - letting client handle routing');
      const response = NextResponse.next({ request: { headers: req.headers } });
      if (shouldNoStore) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
      }
      return response;
    }
  }

  const response = NextResponse.next({ request: { headers: req.headers } });
  if (shouldNoStore) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  return response;
}

export const config = {
  matcher: [
    '/payment/callback',
    '/payment/success',
    '/payment/success/:path*',
    '/chat',
    '/groups-orders',
    '/profile',
    '/profile/:path*',
  ],
};


