/**
 * API Base URL configuration
 * 
 * This function detects the environment at runtime to determine
 * the correct API base URL to use. Now properly handles SSR and
 * Android WebView hydration issues.
 */

// Debug flag - set to true to see API URL detection logs
const DEBUG_API_URL = false;

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
  
  // Debug logging for Android troubleshooting
  if (DEBUG_API_URL) {
    const tgPlatform = (window as any).Telegram?.WebApp?.platform || 'unknown';
    console.log('[API] Detection - hostname:', hostname, '| protocol:', protocol, '| Telegram platform:', tgPlatform);
  }

  // Production domains: use nginx reverse proxy (same domain)
  // IMPORTANT: Always use HTTPS for production to avoid mixed content issues on Android
  if (hostname === 'bahamm.ir' || 
      hostname === 'www.bahamm.ir' || 
      hostname === 'staging.bahamm.ir') {
    // Force HTTPS for production (Android WebView may report http incorrectly)
    const safeProtocol = 'https:';
    const apiUrl = `${safeProtocol}//${hostname}/api`;
    if (DEBUG_API_URL) console.log('[API] Using production URL:', apiUrl);
    return apiUrl;
  }

  // Development: direct connection to backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:8001/api`;
  }

  // Production fallback (important for Android WebView compatibility)
  // This catches cases where Android Telegram WebView uses a different hostname
  if (DEBUG_API_URL) console.log('[API] Using fallback production URL');
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