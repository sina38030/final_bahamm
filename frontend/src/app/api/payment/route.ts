import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

const DEFAULT_PROD_API_BASE = 'https://bahamm.ir/backend/api';

function sanitizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

function getResolvedApiBase(request: NextRequest): string {
  let apiBase = getApiBase();
  const host = request.headers.get('host') || '';
  const isProdHost = /bahamm\.ir$/i.test(host);

  if (isProdHost && apiBase.includes('localhost')) {
    const fallback = sanitizeBase(
      process.env.PAYMENT_API_FALLBACK || DEFAULT_PROD_API_BASE
    );
    console.warn(
      `[Payment API] Host ${host} resolved backend to localhost (${apiBase}). Falling back to ${fallback}`
    );
    apiBase = fallback;
  }

  return apiBase;
}

async function readResponseBody(response: Response): Promise<{ data: any; raw: string }> {
  const raw = await response.text();
  if (!raw) {
    return { data: {}, raw };
  }

  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: { raw }, raw };
  }
}

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

    // Extract authentication token from request headers or cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value || null;

    // Choose endpoint based on whether items are provided
    let endpoint = '/payment/request-public';
    let requestBody: any = {
      amount,
      description,
      mobile,
      email,
    };

    // If items are provided, use the create-order endpoint
    if (items && Array.isArray(items) && items.length > 0) {
      endpoint = '/payment/create-order-public';
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

    // Prepare headers with optional authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[Payment API] Forwarding auth token to backend');
    } else {
      console.log('[Payment API] No auth token found, proceeding as guest');
    }

    let apiBase = getResolvedApiBase(request);
    if (!apiBase.endsWith('/api')) {
      apiBase = `${apiBase}/api`;
    }

    const targetUrl = `${apiBase}${endpoint}`;
    console.log(`[Payment API] Forwarding checkout request to ${targetUrl} (items=${items?.length || 0})`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const { data, raw } = await readResponseBody(response);

    if (!response.ok) {
      console.error(
        `[Payment API] Backend responded ${response.status} for ${targetUrl}:`,
        data?.detail || data?.error || raw?.slice(0, 500)
      );
      return NextResponse.json(
        { error: data.detail || data.error || 'Payment request failed' },
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
    const apiBase = getApiBase();
    let response = await fetch(`${apiBase}/payment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authority, amount }),
    });

    // If FastAPI fails, try quick_server (port 8000)
    if (!response.ok) {
      try {
        const quickServerUrl = apiBase.replace('8001', '8000');
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