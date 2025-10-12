// API URL configuration - Runtime detection
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
    const protocol = window.location.protocol;
    
    // If on production domain, use that domain with port 8001
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const url = `${protocol}//${hostname}:8001/api`;
      console.log('[API Config] Auto-detected production URL:', url);
      return url;
    }
  }
  
  // Default to localhost for development
  const defaultUrl = 'http://localhost:8001/api';
  if (typeof window !== 'undefined') {
    console.log('[API Config] Using default URL:', defaultUrl);
  }
  return defaultUrl;
}

export const API_BASE_URL = getApiBaseUrl();