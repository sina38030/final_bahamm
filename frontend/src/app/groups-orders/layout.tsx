import React from 'react';

// IMPORTANT:
// These pages were being statically pre-rendered with a 1-year CDN cache header (s-maxage=31536000),
// which can cause Android Telegram "Failed to load" after deployments (stale HTML -> missing chunks).
// Force dynamic rendering and disable caching for this route segment.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function GroupsOrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

