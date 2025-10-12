import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ authority: string }> }
) {
  try {
    const { authority } = await params;
    
    if (!authority) {
      return NextResponse.json(
        { success: false, error: 'Authority parameter is required' },
        { status: 400 }
      );
    }

    // Try FastAPI first (port 8001)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    let response = await fetch(`${backendUrl}/api/payment/order/${authority}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data = await response.json();

    // If FastAPI fails, try quick_server (port 8000)
    if (!response.ok) {
      try {
        const quickServerUrl = backendUrl.replace('8001', '8000');
        const fallback = await fetch(`${quickServerUrl}/api/payment/order/${authority}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (fallback.ok) {
          data = await fallback.json();
          response = fallback;
        }
      } catch {}
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.detail || 'Failed to fetch order' },
        { status: response.status }
      );
    }

    // Normalize response to the shape the frontend expects
    return NextResponse.json({ success: true, order: data });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 