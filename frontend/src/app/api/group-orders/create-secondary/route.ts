import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

export async function POST(req: NextRequest) {
  const base = getApiBase();
  
  try {
    const body = await req.json();
    const authHeader = req.headers.get('authorization');
    
    console.log('[API] create-secondary - Backend URL:', `${base}/group-orders/create-secondary`);
    console.log('[API] create-secondary - Request body:', body);
    
    const response = await fetch(`${base}/group-orders/create-secondary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    
    console.log('[API] create-secondary - Response status:', response.status);
    
    const data = await response.json();
    console.log('[API] create-secondary - Response data:', data);
    
    if (!response.ok) {
      console.error('[API] create-secondary - Backend error:', data);
      return NextResponse.json(
        { success: false, error: data?.detail || 'Failed to create secondary group' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] create-secondary error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

