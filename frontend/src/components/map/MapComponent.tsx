'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet to avoid SSR issues
let L: any = null;

interface MapComponentProps {
  center: { lat: number; lng: number } | null | undefined;
  onLocationChange: (lat: number, lng: number) => void;
  invalidateTrigger?: number;
}

export default function MapComponent({ center, onLocationChange, invalidateTrigger }: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [isClient, setIsClient] = useState(false);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // Default center coordinates (Mashhad, Iran)
  const defaultCenter = { lat: 36.2605, lng: 59.6168 };
  
  // Get safe center coordinates
  const getSafeCenter = useCallback(() => {
    if (center && 
        typeof center.lat === 'number' && 
        typeof center.lng === 'number' && 
        !isNaN(center.lat) && 
        !isNaN(center.lng)) {
      return center;
    }
    return defaultCenter;
  }, [center]);

  // Keep the callback ref updated to avoid stale closures
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Safe invalidateSize helper that checks if map is ready
  const safeInvalidateSize = useCallback((map: any) => {
    if (!map) return;
    try {
      // Check if map is properly initialized and has a container
      // Also check if map pane exists (indicates map is fully initialized)
      if (map._container && 
          map._container._leaflet_id !== undefined && 
          map._panes && 
          map._panes.mapPane) {
        map.invalidateSize();
      }
    } catch (error) {
      // Silently ignore errors - map might not be ready yet
      console.warn('Map invalidateSize skipped:', error);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Leaflet on client side
    if (typeof window !== 'undefined' && !L) {
      import('leaflet').then((leaflet) => {
        L = leaflet.default;
        setIsLeafletLoaded(true);
      });
    } else if (L) {
      setIsLeafletLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || !L || !isLeafletLoaded) return;
    
    // Prevent multiple initializations
    if (mapInstanceRef.current) return;

    // Validate center coordinates before creating map
    const safeCenter = getSafeCenter();

    const map = L.map(mapRef.current, {
      center: [safeCenter.lat, safeCenter.lng],
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
      onLocationChangeRef.current(c.lat, c.lng);
    };
    map.on('moveend', handleMoveEnd);

    mapInstanceRef.current = map;

    // Invalidate size multiple times with delays to ensure proper rendering in modals
    // Use safe wrapper to prevent errors
    const invalidateSizes = () => {
      safeInvalidateSize(map);
    };
    
    // Multiple invalidation calls to handle modal rendering
    // Wait a bit longer for map to be fully initialized
    setTimeout(invalidateSizes, 100);
    setTimeout(invalidateSizes, 300);
    setTimeout(invalidateSizes, 500);
    setTimeout(invalidateSizes, 800);
    setTimeout(invalidateSizes, 1200);

    // Window resize handler
    const handleResize = () => {
      safeInvalidateSize(map);
    };
    window.addEventListener('resize', handleResize);

    // ResizeObserver for container size changes (important for modals)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        safeInvalidateSize(map);
        // Extra invalidation after a short delay to ensure tiles load
        setTimeout(() => safeInvalidateSize(map), 100);
        setTimeout(() => safeInvalidateSize(map), 300);
      });
      
      // Observe both containers to catch all size changes
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }
      if (mapRef.current) {
        resizeObserver.observe(mapRef.current);
      }
    }

    return () => {
      map.off('moveend', handleMoveEnd);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        if (mapContainerRef.current) {
          resizeObserver.unobserve(mapContainerRef.current);
        }
        if (mapRef.current) {
          resizeObserver.unobserve(mapRef.current);
        }
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, isLeafletLoaded]);

  // Recenter map when center prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;
    
    const safeCenter = getSafeCenter();
    
    try {
      const current = map.getCenter();
      const target = L.latLng(safeCenter.lat, safeCenter.lng);
      const distance = map.distance(current, target);
      if (distance > 5) {
        map.setView(target, map.getZoom(), { animate: false });
      }
    } catch (error) {
      console.warn('Error recentering map:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, isClient, isLeafletLoaded]);

  // Invalidate size when requested (e.g., when modal opens)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    // Multiple invalidations with delays to ensure proper rendering
    // Use safe wrapper to prevent errors
    const invalidateSizes = () => {
      safeInvalidateSize(map);
    };
    
    // Wait a bit for map to be ready before invalidating
    setTimeout(invalidateSizes, 100);
    setTimeout(invalidateSizes, 250);
    setTimeout(invalidateSizes, 500);
    setTimeout(invalidateSizes, 800);
    setTimeout(invalidateSizes, 1200);
  }, [invalidateTrigger]);

  if (!isClient || !isLeafletLoaded) {
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