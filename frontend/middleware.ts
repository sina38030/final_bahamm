import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

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
  matcher: ['/payment/callback'],
};


