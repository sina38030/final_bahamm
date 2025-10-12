import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    console.log('PUT /api/orders/[orderId]/delivery-slot called');
    const { orderId } = await params;
    const body = await request.json();
    console.log('Request body:', body);

    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001').replace(/\/$/, '');
    const token = request.cookies.get('auth_token')?.value;

    console.log('Backend URL:', BACKEND_URL);
    console.log('Token exists:', !!token);

    // Temporarily allow without token for testing
    if (!token) {
      console.log('No authentication token found - proceeding without auth for testing');
    }

    console.log('Making request to backend:', `${BACKEND_URL}/api/admin/orders/${orderId}/delivery-slot`);

    const response = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/delivery-slot`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', errorText);
      return NextResponse.json(
        { error: errorText || 'Failed to update delivery slot' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response data:', data);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error updating delivery slot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
