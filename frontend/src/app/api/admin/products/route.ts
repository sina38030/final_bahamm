import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const base = getApiBase();
  const search = request.nextUrl.search;
  const target = `${base}/admin/products${search || '?order=landing'}`;

  try {
    const response = await fetch(target, { next: { revalidate: 60 } });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] admin/products proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


