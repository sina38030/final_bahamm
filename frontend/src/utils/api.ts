/**
 * API Base URL configuration
 * 
 * Development mode: Points to backend server (default: http://localhost:8001/api)
 * Production mode: Uses relative path /api (proxied by nginx to backend)
 * 
 * This ensures API calls work correctly in both local development and production.
 * In development, frontend (localhost:3000) needs to call backend (localhost:8001).
 * In production, nginx handles the routing from /api to the backend server.
 */
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001') + '/api'
  : '/api';