// src/components/common/Map.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Leaflet to avoid SSR issues
let L: any = null;

type MapProps = {
  center: [number, number];
  zoom?: number;
  onLocationChange: (lat: number, lng: number) => void;
};

export default function Map({ center, zoom = 13, onLocationChange }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Leaflet on client side
    if (typeof window !== 'undefined' && !L) {
      import('leaflet').then((leaflet) => {
        L = leaflet.default;
        // Fix for default marker icons in Leaflet with Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        });
      });
    }
  }, []);

  // Keep the callback ref updated to avoid stale closures
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Initialize and clean up the map
  useEffect(() => {
    // Ensure this runs only once and only on client
    if (!isClient || !mapContainerRef.current || !mapInstanceRef.current || !L) return;

    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker(center, { draggable: true }).addTo(map);

      map.on('click', (e) => {
    const { lat, lng } = e.latlng;
        marker.setLatLng(e.latlng);
        onLocationChangeRef.current(lat, lng);
      });

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        onLocationChangeRef.current(lat, lng);
      });
    }

    // Cleanup function: This is crucial for preventing errors.
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove(); // Official Leaflet cleanup
        mapInstanceRef.current = null;
      }
    };
  }, [isClient]); // Dependency on isClient ensures this runs when client is ready

  // Effect to update map view when center prop changes from parent
  useEffect(() => {
    if (mapInstanceRef.current && isClient) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom, isClient]);

  if (!isClient) {
    return (
      <div style={{ height: "100%", width: "100%" }} className="flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">در حال بارگذاری نقشه...</div>
      </div>
    );
  }

  return <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />;
}