import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&accept-language=fa`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NextJS-Map-App/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'fa',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    
    const fallbackAddress = {
      display_name: `موقعیت مکانی (${lat}, ${lng})`,
      address: {
        road: 'آدرس دقیق',
        city: 'شهر',
        country: 'ایران'
      }
    };
    
    return NextResponse.json(fallbackAddress);
  }
} 