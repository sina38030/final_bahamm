"use client";

import { useEffect, useState } from 'react';
import { syncTokenFromURL } from '@/utils/crossDomainAuth';

/**
 * CrossDomainAuthWrapper
 * 
 * This component handles cross-domain authentication synchronization.
 * It checks for auth tokens in the URL and saves them to localStorage.
 * 
 * Usage: Wrap your admin pages or any pages that need cross-domain auth with this component.
 */
export function CrossDomainAuthWrapper({ children }: { children: React.ReactNode }) {
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // Sync token from URL if present
    const tokenSynced = syncTokenFromURL();
    
    if (tokenSynced) {
      console.log('[CrossDomainAuthWrapper] Token synced from URL');
    }
    
    setSynced(true);
  }, []);

  // Don't render children until sync is complete to avoid flash of login screen
  if (!synced) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div>در حال بارگذاری...</div>
      </div>
    );
  }

  return <>{children}</>;
}

