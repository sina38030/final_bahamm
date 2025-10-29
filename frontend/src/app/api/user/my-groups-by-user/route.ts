import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

const BACKEND_BASE = getApiBase();

const isOngoing = (s: any): boolean => {
  try {
    const t = String(s || '').toLowerCase();
    return !(t.includes('final') || t.includes('success') || t.includes('fail') || t.includes('expired') || t.includes('موفق') || t.includes('ناموفق') || t.includes('منقضی'));
  } catch {
    return true;
  }
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const res = await fetch(`${BACKEND_BASE}/users/${encodeURIComponent(userId)}/group-buys`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const list: any[] = await res.json().catch(() => []);
    const ids = Array.isArray(list)
      ? list.filter((r: any) => isOngoing(r?.status)).map((r: any) => String(r?.id ?? '')).filter((v: string) => v.length > 0)
      : [];
    return NextResponse.json(ids, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}


