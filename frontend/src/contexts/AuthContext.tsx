"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../utils/api';

// Define user type
export interface User {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  user_type: 'CUSTOMER' | 'MERCHANT';
  coins: number;
  created_at: string;
  is_phone_verified: boolean;
}

// Interface for profile updates
export interface ProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  password?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  login: (phoneNumber: string, userType: 'CUSTOMER' | 'MERCHANT') => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (userData: ProfileUpdate) => Promise<boolean>;
  isAuthenticated: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  phoneNumber: '',
  setPhoneNumber: () => {},
  login: async () => false,
  verifyOtp: async () => false,
  logout: () => {},
  updateUserProfile: async () => false,
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();

  // Load user data from localStorage on initial render
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Validate token by fetching current user
          validateToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
        // Clear potentially corrupted storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Validate token by making a request to the API
  const validateToken = async (authToken: string) => {
    console.log('[AuthContext] Validating token...');
    try {
      const response = await fetch(`${API_BASE_URL}/favorites/check-auth`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        console.warn('[AuthContext] Token validation failed, logging out');
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } else {
        console.log('[AuthContext] Token validated successfully');
        // Refresh user data
        fetchUserProfile(authToken);
      }
    } catch (error) {
      console.error('[AuthContext] Error validating token:', error);
      // Don't clear token on network errors to avoid logging out users unnecessarily
    }
  };

  // Get current user data
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Login (request OTP)
  const login = async (phone: string, userType: 'CUSTOMER' | 'MERCHANT') => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone_number: phone,
          user_type: userType
        })
      });

      if (response.ok) {
        setPhoneNumber(phone);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Verify OTP
  const verifyOtp = async (code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone_number: phoneNumber,
          verification_code: code 
        })
      });

      if (response.ok) {
        const data = await response.json();
        const authToken = data.access_token;
        
        // Store token in localStorage and state
        localStorage.setItem('auth_token', authToken);
        setToken(authToken);

        // Fetch user profile with new token
        const userData = await fetchUserProfile(authToken);
        if (userData) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    router.push('/auth/login');
  };

  // Update user profile
  const updateUserProfile = async (userData: ProfileUpdate) => {
    console.log(`[${new Date().toISOString()}] AuthContext: updateUserProfile called with data:`, userData);
    
    if (!token) {
      console.log(`[${new Date().toISOString()}] AuthContext: No token available, aborting`);
      return false;
    }

    try {
      console.log(`[${new Date().toISOString()}] AuthContext: Sending fetch request to ${API_BASE_URL}/auth/complete-profile`);
      const startTime = Date.now();
      
      // Simulate slow network for testing
      console.log(`[${new Date().toISOString()}] AuthContext: Adding artificial delay (2 seconds) for testing`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`${API_BASE_URL}/auth/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] AuthContext: Received response after ${endTime - startTime}ms, status:`, response.status);

      if (response.ok) {
        const updatedUser = await response.json();
        console.log(`[${new Date().toISOString()}] AuthContext: Response successful, updating user state:`, updatedUser);
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return true;
      } else {
        // Log the error response for debugging
        const errorData = await response.json();
        console.error(`[${new Date().toISOString()}] AuthContext: Profile update failed:`, response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] AuthContext: Error in updateUserProfile:`, error);
      return false;
    }
  };

  const value = {
    user,
    loading,
    token,
    phoneNumber,
    setPhoneNumber,
    login,
    verifyOtp,
    logout,
    updateUserProfile,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 