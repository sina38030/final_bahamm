/**
 * API Base URL configuration
 *
 * Development mode: Prefer NEXT_PUBLIC_API_BASE_URL, otherwise default to http://localhost:8001/api
 * Production mode: Uses relative path /api (proxied by nginx to backend)
 */
const DEV_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:8001') + '/api';

export const API_BASE_URL =
  process.env.NODE_ENV === 'development' ? DEV_BASE : '/api';