import { NextRequest, NextResponse } from 'next/server';
import { getAdminApiBase } from '@/utils/serverBackend';

const BACKEND_BASE = getAdminApiBase();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneRaw = (searchParams.get('phone') || '').toString();
    const phone = phoneRaw.replace(/\D/g, '');
    if (!phone) {
      return NextResponse.json({ error: 'phone required' }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_BASE}/group-buys`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }
    const list: any[] = await res.json().catch(() => []);
    const normalize = (v: any) => v == null ? '' : String(v).replace(/\D/g, '');
    const endings = (p: string) => {
      const s = normalize(p);
      return {
        full: s,
        d10: s.length >= 10 ? s.slice(-10) : s,
        d9: s.length >= 9 ? s.slice(-9) : s,
        d8: s.length >= 8 ? s.slice(-8) : s,
      };
    };
    const me = endings(phone);
    const extractPhones = (r: any): string[] => {
      const cands = [
        r?.leader_username,
        r?.creator_name,
        r?.creator_phone,
        r?.leader_phone,
        r?.leader_phone_number,
        r?.leader_mobile,
        r?.leader?.phone,
        r?.leader?.phone_number,
        r?.leader?.mobile,
        r?.phone,
        r?.mobile,
      ];
      return cands.map(normalize).filter((x) => x.length > 0);
    };
    const isOngoing = (s: string) => {
      const t = (s || '').toString().toLowerCase();
      return !(t.includes('success') || t.includes('final') || t.includes('fail') || t.includes('expire') || t.includes('ناموفق') || t.includes('منقضی'));
    };
    const matchesMe = (leaderPhone: string): boolean => {
      if (!leaderPhone) return false;
      const lp = endings(leaderPhone);
      return Boolean(
        me.full === lp.full ||
        (me.d10 && me.d10 === lp.d10) ||
        (me.d9 && me.d9 === lp.d9) ||
        (me.d8 && me.d8 === lp.d8)
      );
    };

    const myOngoing = Array.isArray(list)
      ? list.filter((r: any) => {
          if (!isOngoing(String(r?.status || ''))) return false;
          const phones = extractPhones(r);
          return phones.some(matchesMe);
        })
      : [];

    const ids = myOngoing
      .map((r: any) => String(r?.invite_code || r?.id || '').trim())
      .filter((v: string) => v.length > 0);

    return NextResponse.json(ids, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}


