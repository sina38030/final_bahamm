/**
 * Cross-Domain Authentication Utilities
 * 
 * Handles token synchronization between bahamm.ir and its subdomains (if any)
 * Uses URL parameters to pass tokens securely between origins
 */

const TOKEN_PARAM = 'auth_token';
const USER_PARAM = 'auth_user';

/**
 * Check if there's a token in the URL and save it to localStorage
 * Returns true if a token was found and saved
 */
export function syncTokenFromURL(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get(TOKEN_PARAM);
    const userData = urlParams.get(USER_PARAM);

    if (token) {
      console.log('[CrossDomainAuth] Token found in URL, saving to localStorage');
      localStorage.setItem('auth_token', token);
      
      if (userData) {
        try {
          const decodedUser = decodeURIComponent(userData);
          localStorage.setItem('user', decodedUser);
          console.log('[CrossDomainAuth] User data saved to localStorage');
        } catch (e) {
          console.warn('[CrossDomainAuth] Failed to parse user data:', e);
        }
      }

      // Clean up URL by removing the auth parameters
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete(TOKEN_PARAM);
      cleanUrl.searchParams.delete(USER_PARAM);
      window.history.replaceState({}, document.title, cleanUrl.toString());

      return true;
    }
  } catch (error) {
    console.error('[CrossDomainAuth] Error syncing token from URL:', error);
  }

  return false;
}

/**
 * Get the current auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Get the current user data from localStorage
 */
export function getAuthUser(): any | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData);
    }
  } catch (e) {
    console.warn('[CrossDomainAuth] Failed to parse user data from localStorage');
  }
  
  return null;
}

/**
 * Build a URL with authentication parameters for cross-domain navigation
 * @param targetUrl - The target URL to navigate to
 * @returns URL with auth parameters appended
 */
export function buildAuthURL(targetUrl: string): string {
  const token = getAuthToken();
  const user = getAuthUser();

  if (!token) {
    return targetUrl;
  }

  try {
    const url = new URL(targetUrl, window.location.origin);
    url.searchParams.set(TOKEN_PARAM, token);
    
    if (user) {
      const userJson = JSON.stringify(user);
      url.searchParams.set(USER_PARAM, encodeURIComponent(userJson));
    }

    return url.toString();
  } catch (error) {
    console.error('[CrossDomainAuth] Error building auth URL:', error);
    return targetUrl;
  }
}

/**
 * Navigate to a different domain with authentication
 * @param targetDomain - The target domain (e.g., 'bahamm.ir' or 'app.bahamm.ir')
 * @param path - The path on the target domain (default: '/')
 */
export function navigateWithAuth(targetDomain: string, path: string = '/'): void {
  if (typeof window === 'undefined') return;

  const protocol = window.location.protocol;
  const targetUrl = `${protocol}//${targetDomain}${path}`;
  const authUrl = buildAuthURL(targetUrl);

  window.location.href = authUrl;
}

/**
 * Check if we need to sync authentication between domains
 * Returns true if we're on a production domain but missing auth
 */
export function needsCrossDomainSync(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  const isProductionDomain =
    hostname === 'bahamm.ir' ||
    hostname === 'www.bahamm.ir';

  if (!isProductionDomain) return false;

  // Check if we have a token in URL but not in localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const hasTokenInUrl = urlParams.has(TOKEN_PARAM);
  const hasTokenInStorage = !!getAuthToken();

  return hasTokenInUrl && !hasTokenInStorage;
}

/**
 * Get the primary domain for redirects
 */
export function getPrimaryDomain(): string {
  if (typeof window === 'undefined') return 'bahamm.ir';
  
  const hostname = window.location.hostname;
  
  // If already on a production domain, keep it
  if (hostname === 'bahamm.ir' || hostname === 'www.bahamm.ir') {
    return hostname;
  }
  
  // Default to main domain
  return 'bahamm.ir';
}

