'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/utils/api';

export default function ErrorProbePage() {
  const [result, setResult] = useState<string>('Pending');

  useEffect(() => {
    (async () => {
      try {
        // Simple probe to backend health
        const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
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


