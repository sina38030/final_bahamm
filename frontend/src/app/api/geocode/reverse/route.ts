import { NextRequest } from 'next/server';

// Optional: very light in-memory throttle to reduce spamming the upstream API
let lastRequestAt = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng') || searchParams.get('lon') || searchParams.get('long'));
    const zoom = Number(searchParams.get('zoom') || '18');
    const lang = searchParams.get('lang') || 'fa';

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid lat/lng query params' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gentle throttle: allow at most one request every 150ms (per instance)
    const now = Date.now();
    if (now - lastRequestAt < 150) {
      await new Promise((r) => setTimeout(r, 150 - (now - lastRequestAt)));
    }
    lastRequestAt = Date.now();

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('lat', String(lat));
    nominatimUrl.searchParams.set('lon', String(lng));
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('zoom', String(zoom));
    nominatimUrl.searchParams.set('accept-language', lang);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const upstream = await fetch(nominatimUrl.toString(), {
        method: 'GET',
        headers: {
          // Nominatim requires a valid and descriptive User-Agent per their usage policy
          'User-Agent': 'bahamm-app/1.0 (contact: support@bahamm.local)',
          'Accept': 'application/json',
          'Accept-Language': lang,
        },
        signal: controller.signal,
        // Do not send credentials/cookies to third-party
        cache: 'no-store',
      });

      clearTimeout(timeout);

      if (!upstream.ok) {
        return new Response(
          JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
          { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = await upstream.json();

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Allow the browser to cache briefly to reduce repeated calls while dragging
          'Cache-Control': 'private, max-age=5',
        },
      });
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || /aborted|timeout/i.test(String(err?.message || ''));
      return new Response(
        JSON.stringify({ error: isAbort ? 'Timeout' : 'Request failed' }),
        { status: isAbort ? 504 : 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


