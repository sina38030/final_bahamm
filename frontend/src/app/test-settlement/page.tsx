'use client';

import { useState } from 'react';

export default function TestSettlementPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testSettlement = async () => {
    setLoading(true);
    setResult('Testing...\n\n');
    
    try {
      const groupId = 6;
      const backendHost = 'http://localhost:8001';
      const token = localStorage.getItem('auth_token');
      
      setResult(prev => prev + `Token: ${token ? 'present' : 'missing'}\n`);
      setResult(prev => prev + `Calling: ${backendHost}/api/group-orders/create-settlement-payment/${groupId}\n\n`);
      
      const response = await fetch(`${backendHost}/api/group-orders/create-settlement-payment/${groupId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      setResult(prev => prev + `Response status: ${response.status} ${response.statusText}\n`);
      setResult(prev => prev + `Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}\n\n`);
      
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
        setResult(prev => prev + `JSON Response:\n${JSON.stringify(data, null, 2)}\n\n`);
      } else {
        const text = await response.text();
        setResult(prev => prev + `Text Response:\n${text}\n\n`);
      }
      
      if (response.ok && data?.success && data?.payment_url) {
        setResult(prev => prev + `✅ SUCCESS! Payment URL: ${data.payment_url}\n`);
        setResult(prev => prev + `Redirecting in 3 seconds...\n`);
        setTimeout(() => {
          window.location.href = data.payment_url;
        }, 3000);
      } else {
        setResult(prev => prev + `❌ Failed\n`);
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ Exception: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Settlement Payment Test v2</h1>
      
      <button
        onClick={testSettlement}
        disabled={loading}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: loading ? '#ccc' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          margin: '20px 0'
        }}
      >
        {loading ? '⏳ Testing...' : '🚀 Test Payment Creation'}
      </button>
      
      <pre style={{
        backgroundColor: '#1f2937',
        color: '#10b981',
        padding: '20px',
        borderRadius: '8px',
        fontSize: '14px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        minHeight: '400px'
      }}>
        {result || 'Click button to test...'}
      </pre>
    </div>
  );
}

