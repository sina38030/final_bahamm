import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  // Redirect legacy path to the correct invitee success page
  if (path === "/payment/success/invite" || path === "/payment/success/invite/") {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/payment/success/invitee";
    return NextResponse.redirect(redirectUrl);
  }

  // Apply no-store for payment success pages to avoid stale HTML after deploys
  if (path === "/payment/success/invitee" || path === "/payment/success" || path.startsWith("/payment/success/")) {
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/payment/success",
    "/payment/success/:path*",
  ],
};


