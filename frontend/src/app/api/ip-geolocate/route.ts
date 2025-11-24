import { NextResponse } from 'next/server';

// Simple IP-based geolocation proxy.
// Tries ipapi.co first, then falls back to ipwho.is
export async function GET() {
  try {
    // Prefer ipapi.co
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return NextResponse.json({ lat: data.latitude, lng: data.longitude }, { status: 200 });
      }
    }
  } catch {}

  try {
    // Fallback: ipwho.is
    const res2 = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (res2.ok) {
      const data2 = await res2.json();
      const lat = data2?.latitude;
      const lng = data2?.longitude;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return NextResponse.json({ lat, lng }, { status: 200 });
      }
    }
  } catch {}

  return NextResponse.json({ error: 'Unable to determine IP location' }, { status: 503 });
}





