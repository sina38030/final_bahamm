/**
 * Helpers for resolving backend base URLs on the server runtime.
 */

function sanitizeBase(url: string): string {
  return url.replace(/\/$/, '');
}

function resolveBackendOrigin(): string {
  const candidates = [
    process.env.BACKEND_URL,
    process.env.INTERNAL_BACKEND_URL,
    process.env.API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const raw = candidates.length > 0 ? candidates[0]! : 'http://127.0.0.1:8001';
  return sanitizeBase(raw.trim());
}

/**
 * Returns the backend origin (without trailing slash).
 */
export function getBackendOrigin(): string {
  return resolveBackendOrigin();
}

/**
 * Returns the admin API base (origin + /api) without trailing slash.
 */
export function getAdminApiBase(): string {
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


