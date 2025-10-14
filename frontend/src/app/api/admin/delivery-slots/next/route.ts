import { NextRequest, NextResponse } from 'next/server';
import { getAdminApiBase } from '@/utils/serverBackend';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';
    const adminBase = getAdminApiBase();

    const response = await fetch(`${adminBase}/delivery-slots/next?days=${encodeURIComponent(days)}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Failed to fetch delivery slots' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in delivery-slots proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
