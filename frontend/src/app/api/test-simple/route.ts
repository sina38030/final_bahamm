import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ 
      success: true, 
      message: 'Simple endpoint works',
      url: req.url
    });
  } catch (error: any) {
    console.error('[TEST-SIMPLE] Error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed'
    }, { status: 500 });
  }
}
