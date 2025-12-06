/**
 * Helpers for resolving backend base URLs on the server runtime.
 */

function sanitizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

function normalizeBackendCandidate(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  let trimmed = sanitizeBase(value.trim());
  if (!trimmed) return null;

  // If the candidate already includes /api, strip it so getApiBase can re-append consistently
  if (trimmed.toLowerCase().endsWith('/api')) {
    trimmed = sanitizeBase(trimmed.slice(0, -4));
  }

  return trimmed || null;
}

function resolveBackendOrigin(): string {
  // Force local backend for development on port 8001
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8001';
  }

  const candidates = [
    process.env.BACKEND_URL,
    process.env.INTERNAL_BACKEND_URL,
    process.env.API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
  ];

  for (const candidate of candidates) {
    const resolved = normalizeBackendCandidate(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return 'http://localhost:8001';
}

/**
 * Returns the backend origin (without trailing slash).
 */
export function getBackendOrigin(): string {
  return resolveBackendOrigin();
}

/**
 * Returns the API base URL (origin + /api) without trailing slash.
 * Use this for all backend API calls to ensure consistent URL formatting.
 */
export function getApiBase(): string {
  const origin = resolveBackendOrigin();
  return origin.endsWith('/api') ? origin : `${origin}/api`;
}

function resolveFrontendOrigin(): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const raw = candidates.length > 0 ? candidates[0]! : 'http://127.0.0.1:3000';
  return sanitizeBase(raw.trim());
}

/**
 * Returns the current site origin for server-side fetches to Next API routes.
 */
export function getSiteOrigin(): string {
  return resolveFrontendOrigin();
}


