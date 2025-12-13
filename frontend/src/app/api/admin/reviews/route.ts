import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

const API_BASE_URL = getApiBase();

export async function GET(req: NextRequest) {
  // Handle fetching all reviews (for admin pending reviews)
  console.log('🔥 GET: Admin reviews API called');
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id');
    const approved = searchParams.get('approved');
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '1000';

    let url = `${API_BASE_URL}/admin/reviews?skip=${skip}&limit=${limit}`;
    if (product_id) url += `&product_id=${product_id}`;
    if (approved !== null && approved !== undefined) url += `&approved=${approved}`;

    console.log('Calling backend GET reviews API:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    console.log('Backend GET response:', res.status);

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.log('Backend error response:', t);
      throw new Error(`Backend error: ${res.status} ${res.statusText}${t ? ` – ${t}` : ''}`);
    }

    const result = await res.json().catch(() => []);
    console.log('✅ Reviews fetched successfully, count:', Array.isArray(result) ? result.length : 'N/A');
    return NextResponse.json(result, { status: 200 });

  } catch (err: any) {
    console.log('❌ Error in admin reviews GET:', err);
    return NextResponse.json({ error: err?.message || 'server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Handle review creation
  console.log('🔥 POST: Admin reviews API called');
  try {
    const body = await req.json().catch(() => ({}));
    console.log('Admin reviews API - received body:', body);
    
    const product_id = Number(body?.product_id);
    const rating = body?.rating != null ? Number(body.rating) : undefined;
    const comment = typeof body?.comment === 'string' ? body.comment : undefined;
    const user_id = body?.user_id != null ? Number(body.user_id) : undefined;
    const display_name = typeof body?.display_name === 'string' ? body.display_name?.trim() : undefined;
    const created_at = typeof body?.created_at === 'string' ? body.created_at : undefined;

    console.log('Parsed values:', { product_id, rating, comment, user_id, display_name });

    // Only product_id and rating are required - display_name is optional in backend
    if (!product_id || !rating || rating < 1 || rating > 5) {
      console.log('Validation failed:', { product_id, rating });
      return NextResponse.json({ error: 'invalid payload - product_id and rating (1-5) required' }, { status: 400 });
    }

    const url = `${API_BASE_URL}/product/${product_id}/reviews`;
    console.log('Full backend URL:', url);
    console.log('API_BASE_URL value:', API_BASE_URL);

    const payload: any = { rating };
    // Include comment even if empty string (backend accepts null/empty)
    if (comment !== undefined) payload.comment = comment;
    if (display_name) payload.display_name = display_name;
    payload.user_id = user_id || 1; // Use provided user_id or default to user 1
    if (created_at) payload.created_at = created_at;
    payload.approved = true; // Admin-created fake reviews should be auto-approved
    
    console.log('Calling backend API with payload:', payload);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    
    console.log('Backend response:', res.status, res.statusText);
    
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.log('Backend error response:', t);
      throw new Error(`Backend error: ${res.status} ${res.statusText}${t ? ` – ${t}` : ''}`);
    }
    
    const result = await res.json().catch(() => ({}));
    console.log('✅ Review created successfully:', result);
    return NextResponse.json(result, { status: 200 });
    
  } catch (err: any) {
    console.log('❌ Error in admin reviews POST:', err);
    return NextResponse.json({ error: err?.message || 'server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Handle review deletion
  console.log('🔥 DELETE: Admin reviews API called');
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id');
    const review_id = searchParams.get('review_id');

    if (!product_id || !review_id) {
      return NextResponse.json({ error: 'product_id and review_id required' }, { status: 400 });
    }

    const url = `${API_BASE_URL}/product/${product_id}/reviews/${review_id}`;
    console.log('Calling DELETE backend API:', url);

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    console.log('Backend DELETE response:', res.status);

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.log('Backend error response:', t);
      throw new Error(`Backend error: ${res.status} ${res.statusText}${t ? ` – ${t}` : ''}`);
    }

    console.log('✅ Review deleted successfully');
    return NextResponse.json({ message: 'Review deleted successfully' }, { status: 200 });

  } catch (err: any) {
    console.log('❌ Error in admin reviews DELETE:', err);
    return NextResponse.json({ error: err?.message || 'server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Handle review update
  console.log('🔥 PUT: Admin reviews API called');
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id');
    const review_id = searchParams.get('review_id');

    if (!product_id || !review_id) {
      return NextResponse.json({ error: 'product_id and review_id required' }, { status: 400 });
    }

    const url = `${API_BASE_URL}/product/${product_id}/reviews/${review_id}`;
    console.log('Calling PUT backend API:', url);
    console.log('With payload:', body);

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    console.log('Backend PUT response:', res.status);

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.log('Backend error response:', t);
      throw new Error(`Backend error: ${res.status} ${res.statusText}${t ? ` – ${t}` : ''}`);
    }

    const result = await res.json().catch(() => ({}));
    console.log('✅ Review updated successfully:', result);
    return NextResponse.json(result, { status: 200 });

  } catch (err: any) {
    console.log('❌ Error in admin reviews PUT:', err);
    return NextResponse.json({ error: err?.message || 'server error' }, { status: 500 });
  }
}


