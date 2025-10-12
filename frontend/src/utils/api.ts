// API URL configuration
// Priority: NEXT_PUBLIC_BACKEND_URL, then NEXT_PUBLIC_API_URL, then localhost
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
const rawUrl = backendUrl || 'http://localhost:8001';
// Ensure it has /api suffix
export const API_BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

// Log the API URL for debugging
if (typeof window !== 'undefined') {
  console.log('[API Config] Backend URL:', API_BASE_URL);
  console.log('[API Config] NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}