'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet to avoid SSR issues
let L: any = null;

interface MapComponentProps {
  center: { lat: number; lng: number };
  onLocationChange: (lat: number, lng: number) => void;
  invalidateTrigger?: number;
}

export default function MapComponent({ center, onLocationChange, invalidateTrigger }: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Leaflet on client side
    if (typeof window !== 'undefined' && !L) {
      import('leaflet').then((leaflet) => {
        L = leaflet.default;
      });
    }
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || !L) return;

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 17,
      zoomControl: true,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: false,
      tapTolerance: 15,
      inertia: true,
      preferCanvas: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Report location on move end only to reduce jitter
    const handleMoveEnd = () => {
      const c = map.getCenter();
      onLocationChange(c.lat, c.lng);
    };
    map.on('moveend', handleMoveEnd);

    mapInstanceRef.current = map;

    // Invalidate size after mount to fix rendering inside modals
    setTimeout(() => map.invalidateSize(), 0);
    setTimeout(() => map.invalidateSize(), 300);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      map.off('moveend', handleMoveEnd);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Recenter map when center prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const current = map.getCenter();
    const target = L.latLng(center.lat, center.lng);
    const distance = map.distance(current, target);
    if (distance > 5) {
      map.setView(target, map.getZoom(), { animate: false });
    }
  }, [center, isClient]);

  // Invalidate size when requested (e.g., when modal opens)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.invalidateSize();
    setTimeout(() => map.invalidateSize(), 250);
  }, [invalidateTrigger]);

  if (!isClient) {
    return (
      <div className="relative w-full h-full min-h-[70vh] flex items-center justify-center bg-gray-100" style={{ minHeight: '70vh' }}>
        <div className="text-gray-500">در حال بارگذاری نقشه...</div>
      </div>
    );
  }

  return (
    <div ref={mapContainerRef} className="relative w-full h-full min-h-[70vh]" style={{ minHeight: '70vh' }}>
      <div ref={mapRef} className="absolute inset-0" style={{ pointerEvents: 'auto', zIndex: 0 }} />
      {/* Center pin overlay (non-interactive) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 1000 }}>
        <div className="relative" style={{ width: 28, height: 64 }}>
          <div
            className="rounded-full shadow"
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              width: 28,
              height: 28,
              background: '#f44336',
              border: '4px solid #fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 20,
              transform: 'translateX(-50%)',
              width: 4,
              height: 40,
              background: '#f44336',
              borderRadius: 6,
              zIndex: 1,
            }}
          />
        </div>
      </div>
    </div>
  );
}