// src/components/common/Map.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Define a different icon for the selected location
const selectedIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "selected-marker",
});

type MapProps = {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPosition?: { lat: number; lng: number };
};

function LocationMarker({
  onLocationSelect,
  initialPosition,
  setPosition,
}: MapProps & { setPosition: (position: L.LatLng | null) => void }) {
  const [position, setLocalPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  // تنظیم موقعیت اولیه مارکر
  useEffect(() => {
    if (initialPosition) {
      setLocalPosition(L.latLng(initialPosition.lat, initialPosition.lng));
      setPosition(L.latLng(initialPosition.lat, initialPosition.lng));
    } else {
      setLocalPosition(L.latLng(35.6892, 51.3890));
      setPosition(L.latLng(35.6892, 51.3890));
    }
  }, [initialPosition, setPosition]);

  // متمرکز کردن نقشه روی موقعیت اولیه
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);

  // مدیریت کلیک روی نقشه
  map.on("click", (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setLocalPosition(L.latLng(lat, lng));
    setPosition(L.latLng(lat, lng));
    onLocationSelect(lat, lng);
  });

  // مدیریت جابه‌جایی مارکر
  const handleMarkerDrag = (e: L.LeafletEvent) => {
    const marker = e.target;
    const newPosition = marker.getLatLng();
    setLocalPosition(newPosition);
    setPosition(newPosition);
    onLocationSelect(newPosition.lat, newPosition.lng);
  };

  return position === null ? null : (
    <Marker
      position={position}
      icon={selectedIcon}
      draggable={true}
      eventHandlers={{
        dragend: handleMarkerDrag,
      }}
    />
  );
}

export default function Map({ onLocationSelect, initialPosition }: MapProps) {
  const defaultPosition: [number, number] = initialPosition
    ? [initialPosition.lat, initialPosition.lng]
    : [35.6892, 51.3890];
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState<L.LatLng | null>(null);

  // Fix for Leaflet icons in Next.js
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  // تابع برای گرفتن موقعیت کاربر و متمرکز کردن نقشه
  const locateUser = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPosition = L.latLng(latitude, longitude);
          setPosition(newPosition);
          onLocationSelect(latitude, longitude);
        },
        (error) => {
          console.error("Error getting user location:", error);
          alert("لطفاً دسترسی به موقعیت خود را فعال کنید یا موقعیت را به صورت دستی انتخاب کنید.");
        },
        { timeout: 10000 }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      alert("مرورگر شما از قابلیت موقعیت‌یابی پشتیبانی نمی‌کند.");
    }
  }, [onLocationSelect]);

  return (
    <div className="relative h-full w-full flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">در حال بارگذاری نقشه...</p>
          </div>
        </div>
      )}
      <MapContainer
        center={defaultPosition}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        whenReady={() => setIsLoading(false)}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          onLocationSelect={onLocationSelect}
          initialPosition={initialPosition}
          setPosition={setPosition}
        />
      </MapContainer>

      {/* دکمه جدید زیر نقشه */}
      <button
        onClick={locateUser}
        className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors w-full md:w-auto self-center"
      >
        تعیین موقعیت دقیق
      </button>
    </div>
  );
}