import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('API route called: /api/admin/delivery-slots/next');

    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';

    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001').replace(/\/$/, '');
    const token = request.cookies.get('auth_token')?.value;

    console.log('Backend URL:', BACKEND_URL);
    console.log('Token exists:', !!token);

    // Temporarily allow without token for testing
    if (!token) {
      console.log('No authentication token found - proceeding without auth for testing');
    }

    console.log('Making request to backend:', `${BACKEND_URL}/api/admin/delivery-slots/next?days=${days}`);

    // Try without authentication first to see if that works
    const response = await fetch(`${BACKEND_URL}/api/admin/delivery-slots/next?days=${days}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // اطمینان از دریافت داده‌های تازه
    });

    console.log('Backend API call completed with status:', response.status);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', errorText);
      return NextResponse.json(
        { error: errorText || 'Failed to fetch delivery slots' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response data:', JSON.stringify(data, null, 2));

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
