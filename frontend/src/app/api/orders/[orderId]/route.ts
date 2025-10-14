import { NextRequest, NextResponse } from 'next/server';
import { getAdminApiBase, getBackendOrigin } from '@/utils/serverBackend';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId parameter is required' },
        { status: 400 }
      );
    }

    const adminBase = getAdminApiBase();
    const backendOrigin = getBackendOrigin();

    // Prefer admin details endpoint (includes shipping_address, shipping_details, delivery_slot)
    let response = await fetch(`${adminBase}/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    // Fallback to public orders endpoint
    if (!response.ok) {
      try {
        const alt = await fetch(`${backendOrigin}/api/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (alt.ok) response = alt;
      } catch {}
    }

    // Optional fallback to quick_server on port 8000 for both endpoints
    if (!response.ok) {
      try {
        const fallbackBase = backendOrigin.replace('8001', '8000');
        let fb = await fetch(`${fallbackBase}/api/admin/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (!fb.ok) {
          fb = await fetch(`${fallbackBase}/api/orders/${encodeURIComponent(orderId)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });
        }
        if (fb.ok) response = fb;
      } catch {}
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail || 'Failed to fetch order' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, order: data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


