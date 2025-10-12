import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[TEST] Raw params:', params);
    const resolved = await params;
    console.log('[TEST] Resolved params:', resolved);
    return NextResponse.json({ 
      success: true, 
      id: resolved.id,
      params: resolved 
    });
  } catch (error: any) {
    console.error('[TEST] Error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed',
      stack: error?.stack 
    }, { status: 500 });
  }
}
