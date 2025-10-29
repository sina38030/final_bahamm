import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const backend = getApiBase();
    // Forward client cookies/authorization to backend for session-based auth
    const cookieHeader = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    console.log('API Route - Headers received:', { 
      cookieHeader: cookieHeader ? 'present' : 'missing', 
      authHeader: authHeader ? 'present' : 'missing' 
    });
    
    const res = await fetch(`${backend}/admin/group-orders/create-settlement-payment/${encodeURIComponent(groupId)}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      // Don't forward body; endpoint doesn't need it
    });
    const data = await res.json().catch(() => ({}));
    console.log('Backend response:', { status: res.status, data });
    if (!res.ok) {
      const error = data.detail || data.error || `HTTP ${res.status}`;
      console.error('Backend error:', error);
      return NextResponse.json({ success: false, error }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('Proxy error:', e);
    return NextResponse.json({ success: false, error: `Internal server error: ${e}` }, { status: 500 });
  }
}


