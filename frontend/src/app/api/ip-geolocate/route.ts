import { NextResponse } from 'next/server';

// Simple IP-based geolocation proxy.
// Tries multiple services for better reliability
export async function GET() {
  // List of IP geolocation services to try (in order of preference)
  const services = [
    {
      name: 'ip-api.com',
      url: 'http://ip-api.com/json/?fields=lat,lon,status',
      extractCoords: (data: any) => {
        if (data?.status === 'success' && typeof data?.lat === 'number' && typeof data?.lon === 'number') {
          return { lat: data.lat, lng: data.lon };
        }
        return null;
      }
    },
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      extractCoords: (data: any) => {
        if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
          return { lat: data.latitude, lng: data.longitude };
        }
        return null;
      }
    },
    {
      name: 'ipwho.is',
      url: 'https://ipwho.is/',
      extractCoords: (data: any) => {
        if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
          return { lat: data.latitude, lng: data.longitude };
        }
        return null;
      }
    },
    {
      name: 'freeipapi.com',
      url: 'https://freeipapi.com/api/json',
      extractCoords: (data: any) => {
        if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
          return { lat: data.latitude, lng: data.longitude };
        }
        return null;
      }
    }
  ];

  for (const service of services) {
    try {
      console.log(`[IP Geolocate] Trying ${service.name}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout per service
      
      const res = await fetch(service.url, { 
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        const coords = service.extractCoords(data);
        if (coords) {
          console.log(`[IP Geolocate] Success from ${service.name}:`, coords);
          return NextResponse.json(coords, { status: 200 });
        }
      }
    } catch (err) {
      console.log(`[IP Geolocate] ${service.name} failed:`, err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // If all services fail, return default location (Mashhad center)
  console.log('[IP Geolocate] All services failed, returning default location');
  return NextResponse.json({ 
    lat: 36.2605, 
    lng: 59.6168, 
    isDefault: true 
  }, { status: 200 });
}










