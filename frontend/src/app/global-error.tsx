'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: 24, fontFamily: 'var(--font-iransans), Tahoma, sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>{error?.message || 'Unknown error'}</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}



