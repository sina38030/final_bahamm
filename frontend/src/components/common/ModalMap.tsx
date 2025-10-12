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

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          onLocationSelect(latitude, longitude);
        },
        (error) => {
          console.error("Error getting user location:", error);
          alert("لطفاً دسترسی به موقعیت خود را فعال کنید.");
        },
        { timeout: 10000 }
      );
    } else {
      alert("مرورگر شما از قابلیت موقعیت‌یابی پشتیبانی نمی‌کند.");
    }
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