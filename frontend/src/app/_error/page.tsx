'use client';

import { useEffect, useState } from 'react';

export default function ErrorProbePage() {
  const [result, setResult] = useState<string>('Pending');

  useEffect(() => {
    (async () => {
      try {
        // Simple probe to backend health if env provided; otherwise skip
        const backend = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');
        const res = await fetch(`${backend}/api/health`, { cache: 'no-store' });
        setResult(`Backend /api/health: ${res.status}`);
      } catch (e: any) {
        setResult(`Backend probe failed: ${e?.message || 'error'}`);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'var(--font-iransans), Tahoma, sans-serif' }}>
      <h1>Error Probe</h1>
      <p>{result}</p>
    </div>
  );
}


