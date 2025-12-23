'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/utils/apiClient';
import { safeStorage } from '@/utils/safeStorage';

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96">در حال بارگذاری نقشه...</div>
});

interface AddressMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSave: (addressData: {
    fullAddress: string;
    details: string;
    phone: string;
    lat: number;
    lng: number;
  }) => void;
  userToken?: string;
  userId?: number;
  initialAddress?: string;
  initialDetails?: string;
  initialPhone?: string;
  initialCoordinates?: { lat: number; lng: number };
}

export default function AddressMapModal({ isOpen, onClose, onAddressSave, userToken, userId, initialAddress, initialDetails, initialPhone, initialCoordinates }: AddressMapModalProps) {
  const { user, token, addUserAddress, loadUserAddresses } = useAuth();
  const [currentAddress, setCurrentAddress] = useState('موقعیت را روی نقشه مشخص کنید');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 36.2605, lng: 59.6168 });
  const [formData, setFormData] = useState({
    fullAddress: '',
    details: '',
    phone: ''
  });
  const [errors, setErrors] = useState({
    fullAddress: '',
    details: '',
    phone: ''
  });
  const addressUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapInvalidateKey, setMapInvalidateKey] = useState(0);

  // Trigger map invalidation when modal opens
  useEffect(() => {
    if (isOpen) {
      // Increment key to trigger map size recalculation
      setMapInvalidateKey(prev => prev + 1);
    }
  }, [isOpen]);

  // Debug state changes
  useEffect(() => {
    console.log('showAddressForm state changed:', showAddressForm);
  }, [showAddressForm]);

  // Load saved phone number from auth context or localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let phoneNumber = '';
      
      // First try to get from authenticated user
      if (user?.phone_number) {
        phoneNumber = user.phone_number;
        console.log('Phone number from authenticated user:', phoneNumber);
      }
      
      // Fallback to localStorage
      if (!phoneNumber) {
        const savedPhone = safeStorage.getItem('userPhone');
        if (savedPhone) {
          phoneNumber = savedPhone;
          console.log('Phone number loaded from localStorage:', phoneNumber);
        }
      }
      
      if (phoneNumber) {
        setFormData(prev => ({ ...prev, phone: phoneNumber }));
      }
    }
  }, [user?.phone_number]);

  // Initialize address each time modal opens, prefilling with provided initial values when available
  useEffect(() => {
    if (!isOpen) return;
    // Prefill form from provided initial props
    let detailsFromStorage = '';
    try {
      const detailsKey = userId ? `userAddressDetails_${userId}` : 'userAddressDetails';
      detailsFromStorage = safeStorage.getItem(detailsKey) || safeStorage.getItem('userAddressDetails') || '';
    } catch {}
    setFormData(prev => ({
      fullAddress: initialAddress || prev.fullAddress || '',
      details: (detailsFromStorage || initialDetails || prev.details || ''),
      phone: initialPhone || prev.phone || ''
    }));
    if (initialCoordinates && typeof initialCoordinates.lat === 'number' && typeof initialCoordinates.lng === 'number') {
      setCoordinates({ lat: initialCoordinates.lat, lng: initialCoordinates.lng });
      setCurrentAddress(initialAddress && initialAddress.trim() !== '' ? initialAddress : 'در حال دریافت آدرس...');
      // Ensure address text reflects coordinates if no initialAddress
      if (!initialAddress || initialAddress.trim() === '') {
        setTimeout(() => updateAddressDisplay(initialCoordinates.lat, initialCoordinates.lng), 0);
      }
    } else {
      // Fallback default location
      setCurrentAddress(initialAddress && initialAddress.trim() !== '' ? initialAddress : 'مشهد، ایران');
      setCoordinates(initialCoordinates || { lat: 36.2605, lng: 59.6168 });
    }
    return () => {
      if (addressUpdateTimeoutRef.current) {
        clearTimeout(addressUpdateTimeoutRef.current);
        addressUpdateTimeoutRef.current = null;
      }
    };
  }, [isOpen, initialAddress, initialDetails, initialPhone, initialCoordinates]);

  // Persist details to localStorage when it changes (per-user if available)
  useEffect(() => {
    if (!isOpen) return;
    try {
      const detailsKey = userId ? `userAddressDetails_${userId}` : 'userAddressDetails';
      if (formData.details && formData.details.trim() !== '') {
        safeStorage.setItem(detailsKey, formData.details);
      }
    } catch {}
  }, [isOpen, userId, formData.details]);

  // Build address from coordinates using Nominatim API with fallback
  const buildAddress = async (lat: number, lng: number): Promise<string> => {
    // Simple coordinate-based fallback for common areas
    const getLocationName = (lat: number, lng: number): string => {
      // Mashhad area
      if (lat >= 36.0 && lat <= 36.5 && lng >= 59.0 && lng <= 60.0) {
        return 'مشهد، خراسان رضوی';
      }
      // Tehran area
      if (lat >= 35.5 && lat <= 35.8 && lng >= 51.0 && lng <= 51.7) {
        return 'تهران';
      }
      // Isfahan area
      if (lat >= 32.5 && lat <= 32.8 && lng >= 51.5 && lng <= 51.8) {
        return 'اصفهان';
      }
      // Shiraz area
      if (lat >= 29.4 && lat <= 29.8 && lng >= 52.3 && lng <= 52.7) {
        return 'شیراز';
      }
      // Default fallback
      return `موقعیت: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    };

    // Try via local proxy API to avoid CORS issues with Nominatim
    try {
      const url = `/api/geocode/reverse?lat=${lat}&lng=${lng}&zoom=18&lang=fa`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const a = data.address || {};
      const parts: string[] = [];
      
      if (a.road) parts.push(a.road);
      if (a.neighbourhood) parts.push(a.neighbourhood);
      if (a.suburb) parts.push(a.suburb);
      if (a.village) parts.push(a.village);
      if (a.town) parts.push(a.town);
      if (a.city) parts.push(a.city);
      
      const address = parts.join('، ');
      return address || getLocationName(lat, lng);
    } catch (error) {
      console.log('Address fetch failed, using fallback:', error);
      // Return location-based fallback
      return getLocationName(lat, lng);
    }
  };

  // Update address display when coordinates change (with debouncing for performance)
  const updateAddressDisplay = async (lat: number, lng: number) => {
    try {
      // Update coordinates immediately for responsive UI
      setCoordinates({ lat, lng });
      
      // Clear any existing timeout
      if (addressUpdateTimeoutRef.current) {
        clearTimeout(addressUpdateTimeoutRef.current);
      }
      
      // Only show loading state if not already loading to prevent flicker
      if (!isAddressLoading) {
        setIsAddressLoading(true);
      }
      
      // Debounce the address API call to avoid too many requests while dragging
      const timeout = setTimeout(async () => {
        try {
          const address = await buildAddress(lat, lng);
          // Only update if the address actually changed to prevent unnecessary re-renders
          setCurrentAddress(prevAddress => {
            if (prevAddress !== address && address.trim() !== '') {
              return address;
            }
            return prevAddress;
          });
          console.log('Address updated:', { lat, lng, address });
        } catch (error) {
          console.error('Error building address:', error);
          const fallbackAddress = `موقعیت: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setCurrentAddress(prevAddress => {
            if (prevAddress !== fallbackAddress) {
              return fallbackAddress;
            }
            return prevAddress;
          });
        } finally {
          setIsAddressLoading(false);
        }
      }, 1200); // Increased debounce to 1.2s to significantly reduce shaking

      addressUpdateTimeoutRef.current = timeout;
    } catch (error) {
      console.error('Error updating address display:', error);
      const fallbackAddress = `موقعیت: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setCurrentAddress(prevAddress => {
        if (prevAddress !== fallbackAddress) {
          return fallbackAddress;
        }
        return prevAddress;
      });
      setIsAddressLoading(false);
    }
  };

  // Fallback: approximate location via IP if precise geolocation fails
  const fallbackToIpLocation = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/ip-geolocate', { method: 'GET' });
      if (!res.ok) return false;
      const data = await res.json();
      if (typeof data?.lat === 'number' && typeof data?.lng === 'number') {
        await updateAddressDisplay(data.lat, data.lng);
        return true;
      }
    } catch {}
    return false;
  };

  // Try geolocation with fallback options
  const tryGeolocation = (options: PositionOptions, isFallback = false) => {
    console.log(`Trying geolocation ${isFallback ? '(fallback)' : '(primary)'} with options:`, options);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          console.log('Geolocation success:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          const { latitude: lat, longitude: lng } = position.coords;
          await updateAddressDisplay(lat, lng);
        } catch (err) {
          console.error('Error processing geolocation success:', err);
          alert('خطا در پردازش موقعیت دریافتی');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        
        // Safe error logging - avoid circular references
        console.log('=== Geolocation Error Debug ===');
        console.log('Error type:', typeof error);
        console.log('Error constructor:', error?.constructor?.name);
        
        // Log individual properties safely
        const errorCode = error?.code;
        const errorMessage = error?.message;
        
        console.log('Error code:', errorCode);
        console.log('Error message:', errorMessage);
        
        let userMessage = 'خطا در دریافت موقعیت';
        
        // Use numeric codes directly
        if (errorCode === 1) {
          userMessage = 'دسترسی به موقعیت مکانی رد شد. لطفاً در تنظیمات مرورگر اجازه دهید یا موقعیت را به صورت دستی روی نقشه انتخاب کنید.';
          console.log('→ Permission denied');
        } else if (errorCode === 2) {
          userMessage = 'اطلاعات موقعیت مکانی در دسترس نیست. می‌توانید موقعیت را به صورت دستی روی نقشه انتخاب کنید.';
          console.log('→ Position unavailable');
        } else if (errorCode === 3) {
          userMessage = 'زمان درخواست موقعیت مکانی به پایان رسید. می‌توانید موقعیت را به صورت دستی روی نقشه انتخاب کنید.';
          console.log('→ Timeout');
        } else {
          userMessage = `خطای نامشخص در دریافت موقعیت مکانی (کد: ${errorCode || 'نامشخص'}). می‌توانید موقعیت را به صورت دستی روی نقشه انتخاب کنید.`;
          console.log('→ Unknown error');
        }
        
        console.log('=== End Debug ===');
        
        // If this is not a fallback attempt and we got POSITION_UNAVAILABLE or TIMEOUT, try with simpler options
        if (!isFallback && (errorCode === 2 || errorCode === 3)) {
          console.log('Primary geolocation failed, trying fallback with simpler options...');
          setTimeout(() => {
            tryGeolocation({
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 0
            }, true);
          }, 1000);
          return;
        }

        // If fallback also failed, attempt approximate IP-based location
        if (errorCode === 2 || errorCode === 3) {
          console.log('Trying IP-based approximate location as last resort...');
          fallbackToIpLocation().then((ok) => {
            if (!ok) {
              alert(userMessage);
            }
          });
          return;
        }

        // Otherwise show error
        alert(userMessage);
        setIsLocating(false);
      },
      options
    );
  };



  // Simple geolocation handler - no complex fallbacks
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('مرورگر شما از قابلیت موقعیت یابی پشتیبانی نمی کند.');
      return;
    }

    if (isLocating) return;

    setIsLocating(true);
    
    // Optimized options to avoid Google API fallback
    const options = {
      enableHighAccuracy: true, // Prefer GPS over network location
      timeout: 15000,
      maximumAge: 60000 // Cache location for 60 seconds
    };
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('Location success:', position.coords);
        const { latitude: lat, longitude: lng } = position.coords;
        await updateAddressDisplay(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.log('Location error code:', error.code);
        console.log('Location error message:', error.message);
        setIsLocating(false);
        
        let msg = '';
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            msg = 'دسترسی به موقعیت رد شد. لطفاً در تنظیمات مرورگر اجازه دهید.';
            break;
          case 2: // POSITION_UNAVAILABLE
            msg = 'موقعیت در دسترس نیست. لطفاً موقعیت را دستی روی نقشه انتخاب کنید.';
            break;
          case 3: // TIMEOUT
            msg = 'زمان درخواست تمام شد. لطفاً دوباره تلاش کنید یا موقعیت را دستی انتخاب کنید.';
            break;
          default:
            msg = 'خطا در دریافت موقعیت. لطفاً موقعیت را دستی روی نقشه انتخاب کنید.';
        }
        // Try IP-based approximate location for code 2/3
        if (error.code === 2 || error.code === 3) {
          fallbackToIpLocation().then((ok) => {
            if (!ok) alert(msg);
          });
        } else {
          alert(msg);
        }
      },
      options
    );
  };

  // Handle confirm position
  const handleConfirmPosition = async () => {
    try {
      console.log('Confirm position clicked', { currentAddress, coordinates });
      
      // Use the manually edited address or build from coordinates if empty
      let address = currentAddress.trim();
      if (!address || address === 'موقعیت را روی نقشه مشخص کنید' || address === 'در حال دریافت آدرس...' || address === 'مشهد، ایران') {
        console.log('Building address from coordinates...');
        address = await buildAddress(coordinates.lat, coordinates.lng);
      }
      
      console.log('Setting form data with address:', address);
      setFormData(prev => ({ ...prev, fullAddress: address }));
      // Ensure the form opens above the map and button overlays
      setTimeout(() => setShowAddressForm(true), 0);
      console.log('Address form should now be visible');
    } catch (error) {
      console.error('Error in handleConfirmPosition:', error);
      alert('خطا در تایید آدرس');
    }
  };

  // Convert Persian digits to English
  const fa2en = (str: string) => {
    return str.replace(/[۰-۹]/g, (ch) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(ch).toString());
  };

  // Validate form
  const validateForm = () => {
    const newErrors = { fullAddress: '', details: '', phone: '' };
    let isValid = true;

    if (!formData.fullAddress.trim()) {
      newErrors.fullAddress = 'لطفاً آدرس را وارد کنید.';
      isValid = false;
    }

    if (!formData.details.trim()) {
      newErrors.details = 'لطفاً جزییات را وارد کنید.';
      isValid = false;
    }

    const phoneNumber = fa2en(formData.phone.trim());
    if (!phoneNumber || phoneNumber.length !== 11 || !phoneNumber.startsWith('09')) {
      newErrors.phone = 'شماره تلفن باید ۱۱ رقم باشد و با ۰۹ شروع شود.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSaving(true);

    try {
      const phoneNumber = fa2en(formData.phone.trim());
      
      // Save phone to localStorage
      if (typeof window !== 'undefined') {
        safeStorage.setItem('userPhone', phoneNumber);
        try {
          const detailsKey = userId ? `userAddressDetails_${userId}` : 'userAddressDetails';
          safeStorage.setItem(detailsKey, formData.details);
        } catch {}
      }

      // Save to database using token (treat token presence as authenticated)
      if (!(token || userToken)) {
        alert('برای ذخیره آدرس باید وارد سیستم شوید.');
        return;
      }

      try {
        const addressPayload = {
          title: 'آدرس جدید',
          full_address: formData.fullAddress,
          receiver_name: formData.details,
          postal_code: "0000000000",
          phone_number: phoneNumber,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          is_default: true,
        };

        console.log('Attempting to save address (fallback-aware):', addressPayload);

        let saved = false;

        // Preferred: use context helper when user is already present
        if (user?.id) {
          saved = await addUserAddress(addressPayload as any);
        } else {
          // Fallback: call API directly with token attached by apiClient
          // If userToken is passed but localStorage is missing it, persist it so apiClient attaches it
          if (!token && userToken && typeof window !== 'undefined') {
            try { safeStorage.setItem('auth_token', userToken); } catch {}
          }
          const response = await apiClient.post('/users/addresses', addressPayload as any);
          if (response.ok) {
            saved = true;
            // Try to refresh addresses in background when context user becomes available
            try { await loadUserAddresses(); } catch {}
          } else {
            try {
              const body = await response.json();
              console.error('Save address failed:', response.status, body);
            } catch {}
            saved = false;
          }
        }

        if (saved) {
          console.log('Address saved to database successfully');
        } else {
          console.error('Failed to save address to database');
          alert('خطا در ذخیره آدرس. لطفاً دوباره تلاش کنید یا بررسی کنید که وارد سیستم هستید.');
          return; // Don't close the modal if save failed
        }
      } catch (error) {
        console.error('Error saving address:', error);
        let errorMessage = 'خطا در ذخیره آدرس.';
        
        if (error instanceof Error) {
          if (error.message.includes('Unauthorized')) {
            errorMessage = 'لطفاً دوباره وارد سیستم شوید.';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'خطا در اتصال به سرور. اتصال اینترنت خود را بررسی کنید.';
          }
        }
        
        alert(errorMessage);
        return; // Don't close the modal if save failed
      }

      // Call the callback with address data
      onAddressSave({
        fullAddress: formData.fullAddress,
        details: formData.details,
        phone: phoneNumber,
        lat: coordinates.lat,
        lng: coordinates.lng
      });

      // Reset and close
      setShowAddressForm(false);
      setFormData({ fullAddress: '', details: '', phone: phoneNumber });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900]"
        onClick={onClose}
      />
      
      {/* Main Modal */}
      <div className="fixed inset-0 z-[950] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden shadow-2xl ring-1 ring-black/5 pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md z-[960]">
            <h2 className="text-lg font-bold text-gray-800">انتخاب موقعیت مکانی</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative overflow-hidden">
            <MapComponent
              center={coordinates}
              onLocationChange={updateAddressDisplay}
              invalidateTrigger={mapInvalidateKey}
            />
            


            {/* Locate Me (Set Position) Button */}
            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all duration-200 font-medium text-sm border border-white/20 backdrop-blur-sm ${
                isLocating 
                  ? 'bg-gray-800/80 text-white cursor-not-allowed' 
                  : 'bg-gray-900/90 text-white hover:bg-black hover:scale-105'
              }`}
              style={{
                zIndex: 1100
              }}
            >
              {isLocating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  <span>در حال یافتن...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                  <span>موقعیت من</span>
                </>
              )}
            </button>
          </div>

          {/* Address Card */}
          <div className="p-5 border-t border-gray-100 bg-white z-[970]">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-700">آدرس انتخاب شده:</p>
                {isLocating && <span className="text-xs text-[#E31C5F] animate-pulse">در حال تعیین موقعیت...</span>}
              </div>
              
              <div className="relative group">
                <div className="absolute top-3 right-3 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <textarea
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  className="w-full bg-gray-50 p-3 pr-10 rounded-xl border border-gray-200 min-h-[80px] resize-none focus:bg-white focus:ring-2 focus:ring-[#E31C5F] focus:border-transparent transition-all duration-200 text-sm leading-relaxed"
                  placeholder="آدرس دقیق اینجا نمایش داده می‌شود..."
                  rows={2}
                />
                {isAddressLoading && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-gray-500 bg-white/80 px-2 py-1 rounded-full shadow-sm backdrop-blur-sm">
                    <span className="w-2 h-2 bg-[#E31C5F] rounded-full animate-pulse"/>
                    بروزرسانی...
                  </div>
                )}
              </div>
              
              {!isLocating && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  برای تغییر موقعیت، نقشه را جابجا کنید
                </p>
              )}
            </div>
            
            <button
              type="button"
              onClick={handleConfirmPosition}
              className="w-full bg-[#E31C5F] text-white py-4 rounded-xl hover:bg-[#c21750] active:scale-[0.98] transition-all font-bold text-base shadow-lg shadow-[#E31C5F]/20 flex items-center justify-center gap-2"
            >
              <span>تایید موقعیت و ادامه</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Address Form Modal */}
      {showAddressForm && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200]"
            onClick={() => setShowAddressForm(false)}
          />
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl ring-1 ring-black/5 overflow-hidden pointer-events-auto"
            >
              <form onSubmit={handleSubmit}>
                {/* Form Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-800">تکمیل اطلاعات آدرس</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shadow-sm border border-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      آدرس کامل
                    </label>
                    <textarea
                      value={formData.fullAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullAddress: e.target.value }))}
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl resize-none focus:bg-white focus:ring-2 focus:ring-[#E31C5F]/20 transition-all duration-200 ${errors.fullAddress ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#E31C5F]'}`}
                      rows={3}
                      required
                    />
                    {errors.fullAddress && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {errors.fullAddress}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        پلاک و واحد
                      </label>
                      <input
                        type="text"
                        value={formData.details}
                        onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-[#E31C5F]/20 transition-all duration-200 ${errors.details ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#E31C5F]'}`}
                        placeholder="مثلاً پلاک ۱۲، واحد ۳"
                        required
                      />
                      {errors.details && (
                        <p className="text-red-500 text-xs mt-1">{errors.details}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        شماره تماس گیرنده
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-[#E31C5F]/20 transition-all duration-200 ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#E31C5F]'}`}
                        placeholder="09xxxxxxxxx"
                        required
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-100' 
                        : 'bg-[#E31C5F] hover:bg-[#c21750] text-white shadow-[#E31C5F]/20'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        <span>در حال ذخیره...</span>
                      </>
                    ) : (
                      <>
                        <span>ثبت و ذخیره آدرس</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </>
  );
}