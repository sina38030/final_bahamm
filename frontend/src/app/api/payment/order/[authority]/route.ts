import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/utils/serverBackend';

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
    const backendOrigin = getBackendOrigin();
    let response = await fetch(`${backendOrigin}/api/payment/order/${authority}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data = await response.json();

    // If FastAPI fails, try quick_server (port 8000)
    if (!response.ok) {
      try {
        const quickServerUrl = backendOrigin.replace('8001', '8000');
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
      // Do NOT propagate server error; return success:false so client can handle gracefully
      return NextResponse.json(
        { success: false, error: data?.detail || `Upstream HTTP ${response.status}` }
      );
    }

    // ✅ FIX: Backend returns {success: true, order: {...}}
    // Don't double-wrap - just return the backend response directly
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching order:', error);
    // Avoid 500s in production for this endpoint; surface a soft failure
    return NextResponse.json({ success: false, error: 'Upstream unavailable' });
  }
} 