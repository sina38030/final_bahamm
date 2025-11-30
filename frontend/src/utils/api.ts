/**
 * API Base URL configuration
 * 
 * This function detects the environment at runtime (client-side only) to determine
 * the correct API base URL to use.
 */
function getApiBaseUrl(): string {
  // Server-side rendering: return empty string, will be computed on client
  if (typeof window === 'undefined') {
    return '';
  }

  // Check for environment variable first
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  // Auto-detect based on hostname
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname;

  // Production domains: use nginx reverse proxy (same domain)
  if (hostname === 'bahamm.ir' || 
      hostname === 'www.bahamm.ir' || 
      hostname === 'staging.bahamm.ir') {
    return `${protocol}//${hostname}/api`;
  }

  // Development: direct connection to backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8001/api`;
  }

  // Fallback: try localhost
  return 'http://localhost:8001/api';
}

// Export as a getter function to ensure it's called at runtime
export const API_BASE_URL = getApiBaseUrl();