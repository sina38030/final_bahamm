import React from 'react';

// Android Telegram WebView can aggressively cache pre-rendered HTML.
// Force dynamic rendering + no-store so HTML/chunks stay in sync after deploys.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

