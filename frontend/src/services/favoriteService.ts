// Favorites API Service
import { API_BASE_URL } from '../utils/api';
import { safeStorage } from '../utils/safeStorage';

// Types
export interface FavoriteProduct {
  id: number;
  name: string;
  image: string;
  price: number;
  discount_price?: number | null;
  group_price?: number;
  category?: string;
  in_stock?: boolean;
}

// Helper to get auth token
const getAuthToken = (): string => {
  const token = safeStorage.getItem('auth_token');
  
  if (!token) {
    console.warn('[AuthToken] No authentication token found in localStorage');
    return '';
  }
  
  // Log a truncated version of the token for debugging (only first few chars)
  const truncatedToken = token.substring(0, 10) + '...';
  console.log(`[AuthToken] Found token: ${truncatedToken}`);
  
  return token;
};

// Add product to favorites
export const addToFavorites = async (productId: number): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        product_id: productId
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
};

// Remove product from favorites
export const removeFromFavorites = async (productId: number): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        product_id: productId
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
};

// Get user favorites
export const getUserFavorites = async (): Promise<FavoriteProduct[]> => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  console.log(`[DEBUG-${requestId}] getUserFavorites called`);
  
  // First check authentication
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    console.error(`[DEBUG-${requestId}] User is not authenticated, cannot fetch favorites`);
    return [];
  }
  
  // Get token after authentication check
  const token = getAuthToken();
  if (!token) {
    console.error(`[DEBUG-${requestId}] Authentication token is missing, cannot fetch favorites`);
    return [];
  }
  
  try {
    // Try to fetch the favorites
    const url = `${API_BASE_URL}/favorites/user`;
    console.log(`[DEBUG-${requestId}] Sending request to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`[DEBUG-${requestId}] Response status: ${response.status}, statusText: ${response.statusText}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error(`[DEBUG-${requestId}] Authentication failed (401): Token may be invalid or expired`);
        // Clear the invalid token
        safeStorage.removeItem('auth_token');
      } else {
        console.error(`[DEBUG-${requestId}] Failed to fetch favorites: ${response.status}`);
      }
      
      // Try to get response text for additional error details
      try {
        const errorText = await response.text();
        console.error(`[DEBUG-${requestId}] Error response: ${errorText}`);
      } catch (e) {
        console.error(`[DEBUG-${requestId}] Could not read error response`);
      }
      
      return [];
    }
    
    // Parse the response carefully
    const responseText = await response.text();
    console.log(`[DEBUG-${requestId}] Response text: ${responseText.substring(0, 100)}...`);
    
    let data;
    
    try {
      data = JSON.parse(responseText);
      console.log(`[DEBUG-${requestId}] Parsed data type: ${Array.isArray(data) ? 'array' : typeof data}`);
      console.log(`[DEBUG-${requestId}] Data length: ${Array.isArray(data) ? data.length : 'not an array'}`);
    } catch (error) {
      console.error(`[DEBUG-${requestId}] Error parsing favorites response:`, error);
      return [];
    }
    
    if (!Array.isArray(data)) {
      console.error(`[DEBUG-${requestId}] API returned non-array data:`, data);
      return [];
    }
    
    // Transform the data
    const transformedData = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      image: item.image || '',
      price: item.price,
      discount_price: item.discount_price,
      group_price: item.group_price || Math.round(item.price * 0.85),
      category: item.category,
      in_stock: item.in_stock
    }));
    
    console.log(`[DEBUG-${requestId}] Returning ${transformedData.length} favorites:`, 
      transformedData.map(item => `ID: ${item.id}, Name: ${item.name}`));
    
    return transformedData;
  } catch (error) {
    console.error(`[DEBUG-${requestId}] Error fetching favorites:`, error);
    return [];
  }
};

// Check if a product is in favorites
export const isProductInFavorites = async (productId: number): Promise<boolean> => {
  try {
    const favorites = await getUserFavorites();
    return favorites.some(fav => fav.id === productId);
  } catch (error) {
    console.error('Error checking favorites status:', error);
    return false;
  }
};

// Check authentication status
export const checkAuth = async (): Promise<boolean> => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  console.log(`[DEBUG-${requestId}] Checking authentication status`);
  
  const token = getAuthToken();
  if (!token) {
    console.warn(`[DEBUG-${requestId}] No token found, user not authenticated`);
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/favorites/check-auth`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`[DEBUG-${requestId}] Auth check response: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn(`[DEBUG-${requestId}] Token is invalid or expired`);
        safeStorage.removeItem('auth_token');
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[DEBUG-${requestId}] Error checking authentication:`, error);
    return false;
  }
};

export default {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  isProductInFavorites,
  checkAuth
}; 