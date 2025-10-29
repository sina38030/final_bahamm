import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const base = getApiBase();
  const target = `${base}/banners`;

  try {
    const response = await fetch(target, { next: { revalidate: 300 } });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch banners' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] banners proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


