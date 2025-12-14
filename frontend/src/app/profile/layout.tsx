import React from 'react';

// Profile pages were being pre-rendered with a long CDN cache TTL which can break
// Android Telegram Mini App after deploys (cached HTML referencing removed chunks).
// Force dynamic rendering and disable caching for the whole /profile segment.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

