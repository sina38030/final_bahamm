/**
 * API Client with automatic JWT token attachment
 */

import { API_BASE_URL } from './api';

// Custom fetch wrapper that automatically adds JWT token
export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    try {
      console.log(`[ApiClient] ${config.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        console.warn('[ApiClient] 401 Unauthorized - clearing auth data');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        // Trigger storage event for cross-tab logout
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth_token',
          newValue: null,
          oldValue: token
        }));
        throw new Error('Unauthorized - please login again');
      }

      return response;
    } catch (error: any) {
      const isAbortError = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted');
      if (isAbortError) {
        console.log(`[ApiClient] Request aborted: ${config.method || 'GET'} ${url}`);
      } else {
        console.error(`[ApiClient] Request failed:`, error);
      }
      throw error;
    }
  },

  async get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    const body = data ? JSON.stringify(data) : undefined;
    return this.request(endpoint, { ...options, method: 'POST', body });
  },

  async put(endpoint: string, data?: any, options: RequestInit = {}) {
    const body = data ? JSON.stringify(data) : undefined;
    return this.request(endpoint, { ...options, method: 'PUT', body });
  },

  async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },

  // Form data helper for file uploads
  async postFormData(endpoint: string, formData: FormData, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    
    const headers: HeadersInit = {
      ...options.headers,
    };
    
    // Don't set Content-Type for FormData - browser will set it with boundary
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    };

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    try {
      console.log(`[ApiClient] POST (FormData) ${url}`);
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        console.warn('[ApiClient] 401 Unauthorized - clearing auth data');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth_token',
          newValue: null,
          oldValue: token
        }));
        throw new Error('Unauthorized - please login again');
      }

      return response;
    } catch (error: any) {
      const isAbortError = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted');
      if (isAbortError) {
        console.log(`[ApiClient] FormData request aborted: ${config.method || 'POST'} ${url}`);
      } else {
        console.error(`[ApiClient] FormData request failed:`, error);
      }
      throw error;
    }
  }
};

export default apiClient;