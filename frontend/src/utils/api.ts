// Resolve API base URL for browser-side fetches
const raw = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_API_BASE_URL || '')) as string | undefined;
const trimmed = (raw || '').trim().replace(/\/$/, '');

// Default: use local backend in dev, else fallback to Next API
const fallback = (typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname))
  ? 'http://127.0.0.1:8001/api'
  : '/api';

export const API_BASE_URL = trimmed || fallback;