import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://127.0.0.1:8001/api';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ authority: string }> }
) {
  try {
    const { authority } = await context.params;
    const body = await req.json();
    const idempotency = req.headers.get('x-idempotency-key') || crypto.randomUUID();

    // Expected body: { kind: 'secondary', source_group_id, source_order_id, expires_at }
    const res = await fetch(`${BACKEND_BASE}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotency,
        // Forward auth if present
        ...(req.headers.get('authorization') ? { 'Authorization': req.headers.get('authorization') as string } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: text || `HTTP ${res.status}` }, { status: res.status });
    }
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create group' }, { status: 500 });
  }
}


