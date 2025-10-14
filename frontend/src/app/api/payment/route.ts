import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/utils/serverBackend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      description,
      mobile,
      email,
      items,
      paymentPercentage,
      friendPrice,
      isFlexiblePayment,
      invite_code,
      mode,
      shipping_address,
      delivery_slot,
      allow_consolidation,
      expected_friends,
    } = body;

    // Authentication disabled for now
    const token = null;

    // Choose endpoint based on whether items are provided
    let endpoint = '/api/payment/request-public';
    let requestBody: any = {
      amount,
      description,
      mobile,
      email,
    };

    // If items are provided, use the create-order endpoint
    if (items && Array.isArray(items) && items.length > 0) {
      endpoint = '/api/payment/create-order-public';
      requestBody = {
        // Forward explicit amount (Rial) so backend/gateway uses discounted total
        amount,
        items: items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          // Forward all the detailed product information from checkout
          name: item.name,
          image: item.image,
          description: item.description,
          market_price: item.market_price,
          friend_price: item.friend_price
        })),
        description,
        mobile,
        email,
        // Forward flexible payment parameters
        paymentPercentage,
        friendPrice,
        isFlexiblePayment,
        // Forward invite code from client body if present so backend can attach group
        invite_code,
        // Pass current purchase mode so backend can pre-create GroupOrder for admin visibility
        mode,
        // Ensure address and time slot are persisted with the order
        shipping_address,
        delivery_slot,
        // Pass toggle state for group consolidation
        allow_consolidation,
        // Forward leader's expected friends count for settlement tracking
        expected_friends,
      };
    }

    const response = await fetch(`${getBackendOrigin()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Payment request failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add a new endpoint for payment verification
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { authority, amount } = body;

    // Authentication disabled for now
    const token = null;

    // Try FastAPI first (port 8001)
    const backendOrigin = getBackendOrigin();
    let response = await fetch(`${backendOrigin}/api/payment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authority, amount }),
    });

    // If FastAPI fails, try quick_server (port 8000)
    if (!response.ok) {
      try {
        const quickServerUrl = backendOrigin.replace('8001', '8000');
        const fallback = await fetch(`${quickServerUrl}/api/payment/verify-public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authority, amount }),
        });
        if (fallback.ok) {
          const data = await fallback.json();
          return NextResponse.json(data);
        }
      } catch {}
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Payment verification failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Payment verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 