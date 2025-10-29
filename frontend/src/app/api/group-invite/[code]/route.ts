import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

export const revalidate = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ success: false, error: 'Invite code is required' }, { status: 400 });
    }

    const apiBase = getApiBase();
    const apiPath = `${apiBase}/payment/group-invite/${encodeURIComponent(code)}`;

    const response = await fetch(apiPath, { next: { revalidate: 30 } });

    if (!response.ok) {
      const detail = await response.text().catch(() => 'Group order not found');
      return NextResponse.json(
        { success: false, error: detail || 'Group order not found' },
        { status: response.status === 404 ? 404 : 502 }
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