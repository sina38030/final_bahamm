'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/utils/apiClient';

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
        const savedPhone = localStorage.getItem('userPhone');
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
      detailsFromStorage = localStorage.getItem(detailsKey) || localStorage.getItem('userAddressDetails') || '';
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
        localStorage.setItem(detailsKey, formData.details);
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
        localStorage.setItem('userPhone', phoneNumber);
        try {
          const detailsKey = userId ? `userAddressDetails_${userId}` : 'userAddressDetails';
          localStorage.setItem(detailsKey, formData.details);
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
            try { localStorage.setItem('auth_token', userToken); } catch {}
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
      <div 
        className="fixed inset-0 bg-black/20 z-[900]"
        onClick={onClose}
      />
      
      {/* Main Modal */}
      <div className="fixed inset-0 z-[950] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white/90 backdrop-blur-sm z-[960]">
            <h2 className="text-lg font-bold">انتخاب آدرس</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
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
              className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-white px-8 py-4 rounded-full shadow-xl transition-all duration-200 font-bold text-lg border-2 border-white ${
                isLocating 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.4), 0 2px 10px rgba(0, 0, 0, 0.2)',
                minWidth: '160px',
                zIndex: 1100
              }}
            >
              {isLocating ? 'در حال تعیین...' : 'تعیین موقعیت'}
            </button>
          </div>

          {/* Address Card */}
          <div className="p-4 border-t bg-white/90 backdrop-blur-sm">
            <div className="mb-3 pb-16">{/* extra padding-bottom so bottom button never overlaps */}
              <p className="text-sm text-gray-600 mb-2">آدرس انتخاب شده:</p>
              {isLocating ? (
                <p className="text-xs text-black mb-2">🔍 در حال تعیین موقعیت شما...</p>
              ) : (
                <p className="text-xs text-black mb-2">"میتوانید نقشه را حرکت دهید.سفارش شما به این آدرس ارسال خواهد شد."</p>
              )}
              <div className="relative">
                <textarea
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  className="w-full bg-white p-3 rounded border min-h-[50px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="آدرس را ویرایش کنید یا موقعیت را روی نقشه مشخص کنید"
                  rows={2}
                  style={{ 
                    minHeight: '60px',
                    lineHeight: '1.4',
                    fontSize: '14px'
                  }}
                />
                {isAddressLoading && (
                  <div className="absolute top-2 left-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
                    در حال بروزرسانی...
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirmPosition}
              className="w-full bg-[#e31c5f] text-white py-3 rounded-lg hover:bg-[#c21750] transition-colors font-medium"
            >
              تایید آدرس
            </button>
          </div>
        </div>
      </div>

      {/* Address Form Modal */}
      {showAddressForm && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[1200]"
            onClick={() => setShowAddressForm(false)}
          />
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <form onSubmit={handleSubmit}>
                {/* Form Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-bold">تکمیل اطلاعات آدرس</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                </div>

                {/* Form Body */}
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      آدرس
                    </label>
                    <textarea
                      value={formData.fullAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullAddress: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg resize-none ${errors.fullAddress ? 'border-red-500' : 'border-gray-300'}`}
                      rows={3}
                      required
                    />
                    {errors.fullAddress && (
                      <p className="text-red-500 text-sm mt-1">{errors.fullAddress}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      جزییات
                    </label>
                    <input
                      type="text"
                      value={formData.details}
                      onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${errors.details ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="مثلاً پلاک ۱۲، واحد ۳"
                      required
                    />
                    {errors.details && (
                      <p className="text-red-500 text-sm mt-1">{errors.details}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      شماره تلفن
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="09xxxxxxxxx"
                      required
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Form Footer */}
                <div className="p-4 border-t">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#e31c5f] hover:bg-[#c21750]'
                    } text-white`}
                  >
                    {isSaving ? 'در حال ذخیره...' : 'ذخیره آدرس'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}