/**
 * API Base URL configuration
 * 
 * This function detects the environment at runtime to determine
 * the correct API base URL to use. Now properly handles SSR and
 * Android WebView hydration issues.
 */
export function getApiUrl(): string {
  // During SSR, return production URL to avoid empty string issues
  if (typeof window === 'undefined') {
    // Check for environment variable during SSR
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (envUrl) {
      const trimmed = envUrl.replace(/\/+$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    }
    // Production fallback for SSR
    return 'https://bahamm.ir/api';
  }

  // Client-side: Check for environment variable first
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  // Auto-detect based on hostname
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // Production domains: use nginx reverse proxy (same domain)
  if (hostname === 'bahamm.ir' || 
      hostname === 'www.bahamm.ir' || 
      hostname === 'staging.bahamm.ir') {
    return `${protocol}//${hostname}/api`;
  }

  // Development: direct connection to backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:8001/api`;
  }

  // Production fallback (important for Android WebView compatibility)
  return 'https://bahamm.ir/api';
}

// Backward compatibility - export as constant but compute properly
// This ensures existing code continues to work
export const API_BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    return getApiUrl();
  }
  // During module initialization (SSR), return empty string
  // but this will be replaced on client-side
  return '';
})();