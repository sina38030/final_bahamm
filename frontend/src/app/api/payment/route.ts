import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, mobile, email, items } = body;

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
      };
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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

    const response = await fetch(`${BACKEND_URL}/api/payment/verify-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authority,
        amount,
      }),
    });

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