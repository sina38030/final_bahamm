import { NextRequest, NextResponse } from 'next/server';
export const revalidate = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    // Fetch from backend server (route lives under /api/payment)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    const response = await fetch(`${backendUrl}/api/payment/group-invite/${code}`, { next: { revalidate: 30 } });
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching group invite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group order data' },
      { status: 500 }
    );
  }
} 