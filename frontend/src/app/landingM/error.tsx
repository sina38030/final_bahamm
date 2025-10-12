'use client';

import { useEffect } from 'react';

export default function LandingMError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void;
}) {
  useEffect(() => {
    console.error('LandingM page error:', error);
  }, [error]);

  return (
    <div style={{ 
      padding: 24, 
      fontFamily: 'var(--font-iransans), Tahoma, sans-serif',
      textAlign: 'center'
    }}>
      <h1>خطایی رخ داد</h1>
      <p>{error?.message || 'خطای ناشناخته'}</p>
      <button 
        onClick={() => reset()}
        style={{
          padding: '12px 24px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '16px'
        }}
      >
        تلاش مجدد
      </button>
    </div>
  );
}

