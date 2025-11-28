"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_BASE_URL } from '../utils/api';
import { apiClient } from '../utils/apiClient';
import { syncTokenFromURL } from '../utils/crossDomainAuth';
import { readPaymentRoleHint, clearPaymentRoleHint } from '../utils/paymentRoleHint';
import type { PaymentRoleHint } from '../utils/paymentRoleHint';

// Define user type
export interface User {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  username?: string | null;
  telegram_id?: number | null;
  user_type: 'CUSTOMER' | 'MERCHANT';
  registration_method?: 'phone' | 'telegram';
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

// Address interface - matches backend UserAddress schema
export interface Address {
  id?: string | number;
  title?: string;
  full_address: string;
  postal_code: string;
  receiver_name: string;
  phone_number: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  user_id?: number;
  created_at?: string;
  // Legacy fields for backward compatibility
  address?: string;
  phone?: string;
  city?: string;
  details?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  phoneNumber: string;
  addresses: Address[];
  setPhoneNumber: (phoneNumber: string) => void;
  login: (phoneNumber: string, userType: 'CUSTOMER' | 'MERCHANT') => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  telegramLogin: (telegramUser?: any) => Promise<boolean>;
  setAuthData: (token: string, userData?: Partial<User>) => void;
  logout: () => void;
  updateUserProfile: (userData: ProfileUpdate) => Promise<boolean>;
  loadUserAddresses: () => Promise<void>;
  addUserAddress: (address: Address) => Promise<boolean>;
  updateUserAddress: (addressId: string, address: Address) => Promise<boolean>;
  deleteUserAddress: (addressId: string | number) => Promise<boolean>;
  isAuthenticated: boolean;
  refreshCoins: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  phoneNumber: '',
  addresses: [],
  setPhoneNumber: () => {},
  login: async () => false,
  verifyOtp: async () => false,
  telegramLogin: async () => false,
  setAuthData: () => {},
  logout: () => {},
  updateUserProfile: async () => false,
  loadUserAddresses: async () => {},
  addUserAddress: async () => false,
  updateUserAddress: async () => false,
  deleteUserAddress: async () => false,
  isAuthenticated: false,
  refreshCoins: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const redirectAfterPaymentOrder = useCallback((order: any, authority: string, hint?: PaymentRoleHint | null) => {
    if (!authority) return;
    setTimeout(() => {
      if (!order) {
        clearPaymentRoleHint(authority);
        router.push('/orders');
        return;
      }
      const orderId = order?.id;
      const groupId = order?.group_order_id || order?.groupId || '';
      const encodedAuthority = encodeURIComponent(authority);
      const treatAsInvited =
        Boolean(order?.is_invited) ||
        Boolean(hint?.role === 'invitee' || hint?.isInvited);
      const inviteeTarget = orderId
        ? `/payment/success/invitee?orderId=${orderId}${groupId ? `&groupId=${groupId}` : ''}&authority=${encodedAuthority}`
        : `/payment/success/invitee?authority=${encodedAuthority}`;
      const soloTarget = orderId
        ? `/payment/success/solo?orderId=${orderId}&authority=${encodedAuthority}`
        : '/orders';
      const go = (target: string) => {
        clearPaymentRoleHint(authority);
        router.push(target);
      };
      if (treatAsInvited) {
        console.log('[AuthContext] Redirect helper: treating as invited user (hint/applied).');
        go(inviteeTarget);
      } else if (groupId) {
        console.log('[AuthContext] Redirect helper: treating as leader (group detected).');
        go(`/invite?authority=${encodedAuthority}`);
      } else {
        console.log('[AuthContext] Redirect helper: treating as solo order.');
        go(soloTarget);
      }
    }, 500);
  }, [router]);
  
  // Use ref for timeout to avoid re-renders
  const addressSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user addresses
  const loadUserAddresses = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Try to load from cache first for faster UI
      const cachedAddresses = localStorage.getItem(`addresses_${user.id}`);
      let hadCachedAddresses = false;
      if (cachedAddresses) {
        try {
          const parsedAddresses = JSON.parse(cachedAddresses);
          setAddresses(parsedAddresses);
          console.log('[AuthContext] Addresses loaded from cache:', parsedAddresses);
          hadCachedAddresses = Array.isArray(parsedAddresses) && parsedAddresses.length > 0;
        } catch (e) {
          console.warn('[AuthContext] Failed to parse cached addresses');
        }
      }

      // Then fetch fresh data from server
      const response = await apiClient.get(`/users/addresses`);
      if (response.ok) {
        const addressData = await response.json();
        // Always reflect server truth. If empty, clear cache to avoid misleading state
        if (Array.isArray(addressData)) {
          setAddresses(addressData);
          localStorage.setItem(`addresses_${user.id}`, JSON.stringify(addressData));
          console.log('[AuthContext] User addresses loaded from server:', addressData);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error loading addresses:', error);
      
      // Fallback to cache if server fails
      const cachedAddresses = localStorage.getItem(`addresses_${user.id}`);
      if (cachedAddresses) {
        try {
          const parsedAddresses = JSON.parse(cachedAddresses);
          setAddresses(parsedAddresses);
          console.log('[AuthContext] Fallback to cached addresses due to server error');
        } catch (e) {
          console.warn('[AuthContext] Failed to parse cached addresses on fallback');
        }
      }
    }
  }, [user?.id]);

  // Load user data from localStorage on initial render
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        // First, check if there's a token in the URL (cross-domain sync)
        const tokenSyncedFromURL = syncTokenFromURL();
        if (tokenSyncedFromURL) {
          console.log('[AuthContext] Token synced from URL (cross-domain auth)');
        }

        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          console.log('[AuthContext] Loading user from localStorage:', JSON.parse(storedUser));
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Immediately fetch fresh user data from server to get latest coins
          console.log('[AuthContext] Fetching fresh user data from server...');
          try {
            const response = await apiClient.get('/users/me');
            if (response.ok) {
              const freshUserData = await response.json();
              console.log('[AuthContext] User data refreshed from server, coins:', freshUserData.coins);
              setUser(freshUserData);
              localStorage.setItem('user', JSON.stringify(freshUserData));
            }
          } catch (err) {
            console.error('[AuthContext] Failed to refresh user data:', err);
          }
        } else {
          console.log('[AuthContext] No stored auth data found');
          
          // If no stored auth, try Telegram auto-login
          const telegramAuthSuccess = await checkTelegramAuth();
          if (telegramAuthSuccess) {
            console.log('[AuthContext] Auto-authenticated via Telegram');
          }
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle Telegram Deep Link start_param (for payment returns)
  useEffect(() => {
    // Only run once and only if Telegram WebApp is available
    if (typeof window === 'undefined' || !window.Telegram?.WebApp) return;
    
    try {
      const startParam = window.Telegram.WebApp.initDataUnsafe?.start_param;
      
      if (startParam) {
        console.log('[AuthContext] Telegram start_param detected:', startParam);
        
        // Parse payment callback format: "payment_AUTHORITY_STATUS"
        const paymentMatch = startParam.match(/payment_([A-Za-z0-9]+)_(OK|NOK|ERROR)/);
        
        if (paymentMatch) {
          const authority = paymentMatch[1];
          const status = paymentMatch[2];
          
          console.log('[AuthContext] Payment callback detected:', { authority, status });
          
          if (status === 'OK') {
            // Payment successful
            if (window.Telegram.WebApp.showAlert) {
              window.Telegram.WebApp.showAlert('✅ پرداخت شما با موفقیت انجام شد!');
            }
            
            // Clear cart from localStorage after successful payment
            try {
              localStorage.removeItem('cart_items');
              console.log('[AuthContext] Cart cleared after successful payment');
            } catch (e) {
              console.warn('[AuthContext] Failed to clear cart:', e);
            }
            
            const paymentRoleHint = readPaymentRoleHint(authority);
            // Get order details from backend using authority
            fetch(`/api/payment/order/${authority}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.order) {
                  const order = data.order;
                  // ✅ DEBUG: Log all order fields to understand the issue
                  console.log('[AuthContext] Order details from payment callback:', {
                    id: order.id,
                    is_invited: order.is_invited,
                    group_order_id: order.group_order_id,
                    user_id: order.user_id,
                    order_type: order.order_type
                  });
                  
                  // ✅ DECISION LOGIC DEBUG
                  console.log('[AuthContext] Redirect decision logic:');
                  console.log('  - is_invited:', order.is_invited, '→', order.is_invited ? 'Go to INVITEE page' : 'Not invited');
                  console.log('  - group_order_id:', order.group_order_id, '→', order.group_order_id ? 'Go to INVITE page (leader)' : 'No group');
                  console.log('  - Final decision (with hint):',
                    (order.is_invited || paymentRoleHint?.role === 'invitee')
                      ? 'INVITEE SUCCESS'
                      : order.group_order_id
                        ? 'INVITE PAGE (leader)'
                        : 'SOLO SUCCESS'
                  );
                  
                  redirectAfterPaymentOrder(order, authority, paymentRoleHint);
                } else {
                  // Fallback to orders page
                  clearPaymentRoleHint(authority);
                  setTimeout(() => router.push('/orders'), 500);
                }
              })
              .catch(err => {
                console.error('[AuthContext] Error getting order:', err);
                clearPaymentRoleHint(authority);
                setTimeout(() => router.push('/orders'), 500);
              });
          } else {
            // Payment failed
            if (window.Telegram.WebApp.showAlert) {
              window.Telegram.WebApp.showAlert('❌ پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.');
            }
            // Redirect to cart/orders
            clearPaymentRoleHint(authority);
            setTimeout(() => router.push('/cart'), 500);
          }
          return;
        }
        
        // ✅ NEW: Check if start_param might be a payment authority (not just invite code)
        // This handles Telegram mini app payment returns where start_param is the authority
        if (startParam.length > 0 && !paymentMatch && startParam.length > 5) {
          console.log('[AuthContext] Attempting to resolve start_param as payment authority...');
          const pendingRoleHint = readPaymentRoleHint(startParam);
          
          fetch(`/api/payment/order/${encodeURIComponent(startParam)}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.order) {
                console.log('[AuthContext] Found order by authority - processing payment return');
                const order = data.order;
                
                // Clear cart from localStorage after successful payment
                try {
                  localStorage.removeItem('cart_items');
                  console.log('[AuthContext] Cart cleared after payment return');
                } catch (e) {
                  console.warn('[AuthContext] Failed to clear cart:', e);
                }
                
                // ✅ DEBUG: Log all order fields to understand the issue
                console.log('[AuthContext] Order details:', {
                  id: order.id,
                  is_invited: order.is_invited,
                  group_order_id: order.group_order_id,
                  user_id: order.user_id,
                  order_type: order.order_type
                });
                redirectAfterPaymentOrder(order, startParam, pendingRoleHint);
                return;
              }
              
              // Not a valid order - treat as invite code
              console.log('[AuthContext] Not a valid authority, treating as invite code');
              clearPaymentRoleHint(startParam);
              setTimeout(() => {
                router.push(`/landingM?invite=${startParam}`);
              }, 500);
            })
            .catch(err => {
              console.error('[AuthContext] Error checking authority:', err);
              // Fallback: treat as invite code
              console.log('[AuthContext] Error on authority check - falling back to invite code');
              clearPaymentRoleHint(startParam);
              setTimeout(() => {
                router.push(`/landingM?invite=${startParam}`);
              }, 500);
            });
          return;
        }
        
        // Check for invite code format (e.g., GB12345ABC or any other invite code)
        // This handles sharing links from the invite page
        if (startParam.length > 0 && !paymentMatch) {
          console.log('[AuthContext] Invite code detected in start_param:', startParam);
          // Redirect to landing page with invite code
          setTimeout(() => {
            router.push(`/landingM?invite=${startParam}`);
          }, 500);
          return;
        }
        
        // Legacy format support: "order_123_group_456" or "order_123"
        const orderMatch = startParam.match(/order_(\d+)(?:_group_(\d+))?/);
        if (orderMatch) {
          const orderId = orderMatch[1];
          const groupId = orderMatch[2];
          
          console.log('[AuthContext] Legacy order deeplink:', { orderId, groupId });
          
          setTimeout(() => {
            if (groupId) {
              router.push(`/track/${groupId}`);
            } else {
              router.push(`/orders/${orderId}`);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error handling start_param:', error);
    }
  }, []); // Only run once on mount

  // Listen for storage events to sync logout across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && e.newValue === null) {
        console.log('[AuthContext] Logout detected in another tab');
        setUser(null);
        setToken(null);
        setAddresses([]); // Clear addresses on logout
      } else if (e.key === 'auth_token' && e.newValue) {
        console.log('[AuthContext] Login detected in another tab');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setToken(e.newValue);
          setUser(JSON.parse(storedUser));
        }
      } else if (e.key === 'address_sync' && e.newValue && user?.id) {
        // Handle cross-tab address synchronization
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData.userId === user.id) {
            console.log('[AuthContext] Address sync event detected:', syncData);
            
            // Debounce multiple rapid events
            if (addressSyncTimeoutRef.current) {
              clearTimeout(addressSyncTimeoutRef.current);
              addressSyncTimeoutRef.current = null;
            }
            
            addressSyncTimeoutRef.current = setTimeout(() => {
              switch (syncData.action) {
                case 'add':
                  setAddresses(prev => {
                    const exists = prev.some(addr => addr.id === syncData.address.id);
                    return exists ? prev : [...prev, syncData.address];
                  });
                  break;
                case 'update':
                  setAddresses(prev => prev.map(addr => 
                    addr.id === syncData.addressId ? syncData.address : addr
                  ));
                  break;
                case 'delete':
                  setAddresses(prev => prev.filter(addr => addr.id !== syncData.addressId));
                  break;
                case 'refresh':
                  // Reload addresses from server
                  loadUserAddresses();
                  break;
              }
              addressSyncTimeoutRef.current = null;
            }, 100); // 100ms debounce
          }
        } catch (error) {
          console.error('[AuthContext] Error parsing address sync data:', error);
        }
      }
    };

    // Only add event listeners in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
      if (addressSyncTimeoutRef.current) {
        clearTimeout(addressSyncTimeoutRef.current);
        addressSyncTimeoutRef.current = null;
      }
    };
  }, [user?.id, loadUserAddresses]); // Add dependencies

  // Load addresses when user is authenticated
  useEffect(() => {
    if (user?.id && !loading) {
      console.log('[AuthContext] User authenticated, loading addresses...');
      loadUserAddresses();
    }
  }, [user?.id, loading, loadUserAddresses]);

  // Validate token by making a request to the API
  const validateToken = async (authToken: string) => {
    // DISABLE TOKEN VALIDATION - IT WAS BREAKING THE AUTH
    console.log('[AuthContext] Skipping token validation to avoid logout issues');
    return;
  };

  // Get current user data
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await apiClient.get('/users/me');

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

  // Refresh only coins from server and sync to user/localStorage
  const refreshCoins = useCallback(async () => {
    try {
      if (!token) return;
      const res = await apiClient.get('/users/coins');
      if (res.ok) {
        const data = await res.json();
        const newCoins = typeof data?.coins === 'number' ? data.coins : 0;
        setUser(prev => {
          if (!prev) return prev;
          const updated = { ...prev, coins: newCoins } as User;
          try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    } catch (e) {
      // ignore
    }
  }, [token]);

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

  // Telegram Login
  const telegramLogin = async (telegramUser?: any) => {
    try {
      // If no telegramUser provided, try to get from Telegram WebApp
      if (!telegramUser && typeof window !== 'undefined') {
        const tg = window.Telegram?.WebApp;
        if (!tg || !tg.initData) {
          console.log('[AuthContext] Telegram WebApp not available');
          return false;
        }
        
        telegramUser = {
          init_data: tg.initData,
          init_data_unsafe: tg.initDataUnsafe
        };
      }
      
      if (!telegramUser) {
        console.log('[AuthContext] No Telegram user data available');
        return false;
      }
      
      console.log('[AuthContext] Attempting Telegram login...');
      
      const response = await fetch(`${API_BASE_URL}/auth/telegram-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramUser)
      });

      if (response.ok) {
        const data = await response.json();
        const authToken = data.access_token;
        
        console.log('[AuthContext] Telegram login successful');
        
        // Store token
        localStorage.setItem('auth_token', authToken);
        setToken(authToken);
        
        // Fetch user profile with the new token
        const userData = await fetchUserProfile(authToken);
        if (userData) {
          return true;
        }
      } else {
        const errorData = await response.json();
        console.error('[AuthContext] Telegram login failed:', errorData);
      }
      
      return false;
    } catch (error) {
      console.error('[AuthContext] Telegram login error:', error);
      return false;
    }
  };
  
  // Check if user is in Telegram and auto-login
  const checkTelegramAuth = async () => {
    if (typeof window === 'undefined') return false;
    
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) {
      console.log('[AuthContext] Not running in Telegram WebApp');
      return false;
    }
    
    console.log('[AuthContext] Telegram WebApp detected, attempting auto-login...');
    
    // Mark Telegram WebApp as ready
    tg.ready();
    
    // Attempt auto-login
    const success = await telegramLogin();
    if (success) {
      console.log('[AuthContext] Telegram auto-login successful');
    } else {
      console.log('[AuthContext] Telegram auto-login failed');
    }
    
    return success;
  };

  // Set authentication data directly (allows partial user and fills sensible defaults)
  const setAuthData = (authToken: string, userData?: Partial<User>) => {
    try {
      localStorage.setItem('auth_token', authToken);
      setToken(authToken);

      if (userData) {
        const mergedUser: User = {
          id: typeof userData.id === 'number' ? userData.id : (user?.id ?? 0),
          first_name: userData.first_name ?? null,
          last_name: userData.last_name ?? null,
          email: userData.email ?? null,
          phone_number: userData.phone_number ?? null,
          username: userData.username ?? null,
          telegram_id: userData.telegram_id ?? null,
          user_type: userData.user_type ?? 'CUSTOMER',
          registration_method: userData.registration_method ?? 'phone',
          coins: typeof userData.coins === 'number' ? userData.coins : (user?.coins ?? 0),
          created_at: userData.created_at ?? new Date().toISOString(),
          is_phone_verified: userData.is_phone_verified ?? true,
        };
        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
      } else {
        // If no user data provided, try to populate from server in background
        void fetchUserProfile(authToken);
      }
    } catch (e) {
      console.error('[AuthContext] Error in setAuthData:', e);
    }
  };

  // Logout
  const logout = () => {
    try {
      const prevUserId = user?.id;
      const oldToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

      // Clear auth core
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // Clear legacy/global caches that can leak identity across users
      try { localStorage.removeItem('userPhone'); } catch {}
      try { localStorage.removeItem('userAddress'); } catch {}

      // Clear per-user caches for the current user
      if (prevUserId != null) {
        try { localStorage.removeItem(`userAddress_${prevUserId}`); } catch {}
        try { localStorage.removeItem(`addresses_${prevUserId}`); } catch {}
        try { localStorage.removeItem(`userAddressDetails_${prevUserId}`); } catch {}
      }

      // Clear in-memory caches
      setAddresses([]);

      // Notify other tabs
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'auth_token',
            newValue: null,
            oldValue: oldToken || null,
          }));
        } catch {}
      }
    } catch {}

    setUser(null);
    setToken(null);
    // Stay on the same page by default. If currently on an auth route, go to profile.
    try {
      if (pathname && pathname.startsWith('/auth')) {
        router.push('/profile');
      }
    } catch {}
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

  // Add new address
  const addUserAddress = async (address: Address): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const payload = {
        title: address.title || 'آدرس',
        full_address: address.full_address || '',
        postal_code: address.postal_code || '',
        receiver_name: address.receiver_name || (user?.first_name || ''),
        phone_number: address.phone_number || user?.phone_number || '',
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
        is_default: address.is_default ?? (addresses.length === 0),
      };
      const response = await apiClient.post(`/users/addresses`, payload);
      if (response.ok) {
        const newAddress = await response.json();
        const updatedAddresses = [...addresses, newAddress];
        setAddresses(updatedAddresses);
        
        // Cache addresses in localStorage
        localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));
        
        // Trigger storage event for cross-tab sync
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'address_sync',
            newValue: JSON.stringify({ action: 'add', userId: user.id, address: newAddress }),
            oldValue: null
          }));
        }
        
        console.log('[AuthContext] Address added and synced:', newAddress);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Error adding address:', error);
      return false;
    }
  };

  // Update existing address
  const updateUserAddress = async (addressId: string, address: Address): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const payload = {
        title: address.title,
        full_address: address.full_address,
        postal_code: address.postal_code,
        receiver_name: address.receiver_name,
        phone_number: address.phone_number,
        latitude: address.latitude,
        longitude: address.longitude,
        is_default: address.is_default,
      };
      const response = await apiClient.put(`/users/addresses/${addressId}`, payload);
      if (response.ok) {
        const updatedAddress = await response.json();
        const updatedAddresses = addresses.map(addr => 
          String(addr.id) === String(addressId) ? updatedAddress : addr
        );
        setAddresses(updatedAddresses);
        
        // Cache addresses in localStorage
        localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));
        
        // Trigger storage event for cross-tab sync
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'address_sync',
            newValue: JSON.stringify({ action: 'update', userId: user.id, addressId, address: updatedAddress }),
            oldValue: null
          }));
        }
        
        console.log('[AuthContext] Address updated and synced:', updatedAddress);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Error updating address:', error);
      return false;
    }
  };

  // Delete address
  const deleteUserAddress = async (addressId: string | number): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const idParam = Number.isFinite(Number(addressId)) ? Number(addressId) : String(addressId);
      const response = await apiClient.delete(`/users/addresses/${idParam}`);
      if (response.ok) {
        const updatedAddresses = addresses.filter(addr => String(addr.id) !== String(addressId));
        setAddresses(updatedAddresses);
        
        // Cache addresses in localStorage
        localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));
        
        // Trigger storage event for cross-tab sync
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'address_sync',
            newValue: JSON.stringify({ action: 'delete', userId: user.id, addressId }),
            oldValue: null
          }));
        }
        
        console.log('[AuthContext] Address deleted and synced:', addressId);
        return true;
      } else {
        try {
          const errorBody = await response.json();
          console.error('[AuthContext] Delete address failed:', response.status, errorBody);
        } catch (e) {
          console.error('[AuthContext] Delete address failed with status:', response.status);
        }
        return false;
      }
    } catch (error) {
      console.error('[AuthContext] Error deleting address:', error);
      return false;
    }
  };

  const value = {
    user,
    loading,
    token,
    phoneNumber,
    addresses,
    setPhoneNumber,
    login,
    verifyOtp,
    telegramLogin,
    setAuthData,
    logout,
    updateUserProfile,
    loadUserAddresses,
    addUserAddress,
    updateUserAddress,
    deleteUserAddress,
    isAuthenticated: !!user && !!token,
    refreshCoins,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 