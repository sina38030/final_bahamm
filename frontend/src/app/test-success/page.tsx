'use client';

import { useEffect, useState } from 'react';

export default function TestSuccessPage() {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    console.log(`[TestSuccess] ${message}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Component mounted');
    
    // Override all navigation methods
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(state, title, url) {
      addLog(`BLOCKED pushState to: ${url}`);
      if (typeof url === 'string' && url.includes('/invite')) {
        addLog(`🚫 PREVENTED redirect to invite: ${url}`);
        return;
      }
      return originalPushState.call(this, state, title, url);
    };
    
    window.history.replaceState = function(state, title, url) {
      addLog(`BLOCKED replaceState to: ${url}`);
      if (typeof url === 'string' && url.includes('/invite')) {
        addLog(`🚫 PREVENTED redirect to invite: ${url}`);
        return;
      }
      return originalReplaceState.call(this, state, title, url);
    };
    
    // Monitor location changes
    let currentLocation = window.location.href;
    const checkLocation = () => {
      if (window.location.href !== currentLocation) {
        addLog(`Location changed from ${currentLocation} to ${window.location.href}`);
        if (window.location.href.includes('/invite')) {
          addLog(`🚨 DETECTED redirect to invite page!`);
        }
        currentLocation = window.location.href;
      }
    };
    
    const interval = setInterval(checkLocation, 100);
    
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen p-4 bg-gray-100" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-green-600">
          🧪 صفحه تست موفقیت
        </h1>
        
        <div className="mb-4 p-4 bg-green-100 rounded">
          <p className="text-green-800">
            این صفحه برای تست مشکل redirect ساخته شده است.
            اگر refresh کنید و هنوز اینجا هستید، یعنی مشکل حل شده!
          </p>
        </div>
        
        <div className="mb-4">
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            🔄 Refresh صفحه
          </button>
          
          <button 
            onClick={() => addLog('Manual log test')}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            ➕ اضافه کردن Log
          </button>
        </div>
        
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          <h3 className="text-white mb-2">📊 Console Logs:</h3>
          {logs.length === 0 ? (
            <div>در انتظار logs...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>URL فعلی:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
          <p><strong>Path:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'Loading...'}</p>
        </div>
      </div>
    </div>
  );
}
