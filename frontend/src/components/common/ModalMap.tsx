// src/components/common/ModalMap.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-gray-600">در حال بارگذاری نقشه...</p>
    </div>
  </div>,
});

type ModalMapProps = {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPosition?: { lat: number; lng: number };
  isOpen: boolean;
};

export default function ModalMap({ onLocationSelect, initialPosition, isOpen }: ModalMapProps) {
  const [position, setPosition] = useState<[number, number]>(() => 
    initialPosition ? [initialPosition.lat, initialPosition.lng] : [35.6892, 51.3890]
  );
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPosition) {
        setPosition([initialPosition.lat, initialPosition.lng]);
      }
      const timer = setTimeout(() => setShouldRender(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isOpen, initialPosition]);

  if (!isOpen) {
    return null;
  }

  // Detect if user is on Chrome browser
  const isChrome = typeof navigator !== 'undefined' && /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  
  // Check if we're in a secure context (required for geolocation in Chrome)
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

  const locateUser = () => {
    if (!navigator.geolocation) {
      alert("مرورگر شما از قابلیت موقعیت‌یابی پشتیبانی نمی‌کند.");
      return;
    }

    // Check secure context for Chrome
    if (isChrome && !isSecureContext) {
      alert('برای استفاده از موقعیت‌یابی در Chrome، سایت باید روی HTTPS باشد.\n\nلطفاً موقعیت را به صورت دستی روی نقشه انتخاب کنید.');
      return;
    }

    console.log('[ModalMap] Attempting geolocation with high accuracy...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[ModalMap] Location success:', pos.coords);
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        onLocationSelect(latitude, longitude);
      },
      (error) => {
        console.error("[ModalMap] High accuracy failed:", error.code, error.message);
        
        // If permission denied, show error immediately
        if (error.code === 1) {
          if (isChrome) {
            alert('دسترسی به موقعیت رد شد.\n\nبرای فعال کردن:\n1. روی آیکون قفل در نوار آدرس کلیک کنید\n2. Location را Allow کنید\n3. صفحه را رفرش کنید');
          } else {
            alert('دسترسی به موقعیت رد شد. لطفاً در تنظیمات مرورگر اجازه دهید.');
          }
          return;
        }
        
        // For POSITION_UNAVAILABLE or TIMEOUT, try with low accuracy
        console.log('[ModalMap] Trying with low accuracy...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setPosition([latitude, longitude]);
            onLocationSelect(latitude, longitude);
          },
          (error2) => {
            console.error("[ModalMap] Low accuracy also failed:", error2.code, error2.message);
            
            // Show Chrome-specific help message
            if (isChrome) {
              alert('موقعیت‌یابی در Chrome دچار مشکل شد.\n\n🔧 راه‌حل‌ها:\n\n1. در تنظیمات Chrome:\n   Settings → Privacy → Site Settings → Location\n   مطمئن شوید که فعال است\n\n2. در تنظیمات ویندوز:\n   Settings → Privacy → Location\n   Location را روشن کنید\n\n3. یا موقعیت را به صورت دستی روی نقشه انتخاب کنید');
            } else {
              alert('موقعیت در دسترس نیست.\n\nلطفاً موقعیت را به صورت دستی روی نقشه انتخاب کنید.');
            }
          },
          { 
            enableHighAccuracy: false, 
            timeout: 15000, 
            maximumAge: 300000 // Allow cached location up to 5 minutes
          }
        );
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 60000 
      }
    );
  };
  
  const handleLocationChange = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  return (
    <div className="relative h-full w-full flex flex-col">
      <div style={{ height: "100%", width: "100%" }}>
        {shouldRender && (
          <Map
            center={position}
            onLocationChange={handleLocationChange}
          />
        )}
      </div>
      <button
        onClick={locateUser}
        className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors w-full md:w-auto self-center"
      >
        تعیین موقعیت دقیق
      </button>
    </div>
  );
} 