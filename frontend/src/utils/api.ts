// API URL configuration - Runtime detection with proxy support
function getApiBaseUrl(): string {
  // Check environment variables first
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) {
    const url = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
    if (typeof window !== 'undefined') {
      console.log('[API Config] Using env URL:', url);
    }
    return url;
  }
  
  // Runtime detection for browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If on production domain, use relative API path
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const url = `/api`;
      console.log('[API Config] Auto-detected URL:', url);
      return url;
    }
  }
  
  // Default to localhost for development (direct connection)
  const defaultUrl = 'http://localhost:8001/api';
  if (typeof window !== 'undefined') {
    console.log('[API Config] Using default URL:', defaultUrl);
  }
  return defaultUrl;
}

export const API_BASE_URL = getApiBaseUrl();