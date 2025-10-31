import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/utils/serverBackend';

export const revalidate = 30;
// Force rebuild - track page pricing fix

const BACKEND_BASE = getApiBase();

function normalizeDateString(input: any): string | null {
  if (!input) return null;
  const s = String(input);
  try {
    if (/Z|[+-]\d{2}:?\d{2}$/.test(s)) {
      return new Date(s).toISOString();
    }
    const withOffset = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}+03:30`;
    return new Date(withOffset).toISOString();
  } catch {
    return null;
  }
}

function toGroupStatus(input: string | undefined): 'ongoing' | 'success' | 'failed' {
  const s = (input || '').toString();
  if (s.includes('موفق')) return 'success';
  if (s.includes('ناموفق') || s.includes('منقضی')) return 'failed';
  const upper = s.toUpperCase();
  if (upper.includes('FINALIZED') || upper.includes('SUCCESS')) return 'success';
  if (upper.includes('FAILED') || upper.includes('EXPIRED')) return 'failed';
  return 'ongoing';
}

function parseMs(value?: string | null): number | null {
  if (!value) return null;
  const s = String(value);
  
  // First try direct parsing if it already has timezone info
  const direct = Date.parse(s);
  if (!Number.isNaN(direct)) return direct;
  
  // Normalize format (replace space with T)
  const norm = s.replace(' ', 'T');
  
  // If the string doesn't have timezone info, assume it's Tehran time (UTC+3:30)
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(norm)) {
    // Add Tehran timezone offset (+03:30) to treat it as Tehran time
    const tehranTime = Date.parse(norm + '+03:30');
    if (!Number.isNaN(tehranTime)) return tehranTime;
  }
  
  // Try parsing as local time
  const local = Date.parse(norm);
  if (!Number.isNaN(local)) return local;
  
  // Last resort: try as UTC
  const utc = Date.parse(norm + 'Z');
  if (!Number.isNaN(utc)) return utc;
  
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    console.log('[GET /api/groups] Starting, params:', params);
    const resolvedParams = await params;
    console.log('[GET /api/groups] Resolved params:', resolvedParams);
    const { groupId: rawGroupId } = resolvedParams;
    let groupId = rawGroupId;
    console.log('[GET /api/groups] Group ID:', groupId);

    // If groupId is not numeric, try to resolve from list by invite_code
    if (!/^\d+$/.test(groupId)) {
      try {
        const res = await fetch(`${BACKEND_BASE}/admin/group-buys`, { cache: 'no-store' });
        if (res.ok) {
          const list: any[] = await res.json().catch(() => []);
          const byExact = list.find((r: any) => String(r.invite_code || '').trim() === groupId.trim());
          const byCase = byExact || list.find((r: any) => String(r.invite_code || '').toLowerCase() === groupId.toLowerCase());
          if (byCase && byCase.id != null) {
            groupId = String(byCase.id);
          }
        }
      } catch {
        // ignore
      }
      // Last resort: extract numeric id from GB prefix
      if (!/^\d+$/.test(groupId)) {
        const m = groupId.match(/GB(\d+)/i);
        if (m && m[1]) {
          groupId = m[1];
        }
      }
    }

  // Fetch details and list in parallel with tight timeouts to avoid long stalls
  const fetchWithTimeout = async (url: string, ms: number) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(url, { cache: 'no-store', signal: c.signal });
      return r;
    } finally {
      clearTimeout(t);
    }
  };

  const [detailsRes, listRes] = await Promise.allSettled([
    fetchWithTimeout(`${BACKEND_BASE}/admin/group-buys/${groupId}`, 3000),
    fetchWithTimeout(`${BACKEND_BASE}/admin/group-buys`, 2500),
  ]);

  let details: any | null = null;
  if (detailsRes.status === 'fulfilled' && detailsRes.value?.ok) {
    try { details = await detailsRes.value.json(); } catch { details = null; }
  }

  let listRow: any | null = null;
  if (listRes.status === 'fulfilled' && listRes.value?.ok) {
    try {
      const list: any[] = await listRes.value.json().catch(() => []);
      listRow = Array.isArray(list) ? list.find((r: any) => String(r.id) === String(groupId)) : null;
    } catch { listRow = null; }
  }

  const inviteLink: string | undefined = listRow?.invite_link || (listRow?.invite_code ? `/landingM?invite=${listRow.invite_code}` : undefined);
  // Secondary groups data (hardcoded from database)
  const SECONDARY_GROUPS_DATA: Record<number, any> = {
    103: { kind: 'secondary', source_order_id: null, items: [{ product_id: 4, quantity: 1, unit_price: 6000.0, product_name: '' }] },
    104: { kind: 'secondary', source_order_id: null, items: [{ product_id: 4, quantity: 1, unit_price: 6000.0, product_name: '' }] },
    105: { kind: 'secondary', source_order_id: null, items: [{ product_id: 4, quantity: 1, unit_price: 6000.0, product_name: '' }] },
    108: { kind: 'secondary', source_order_id: 225, items: [{ product_id: 2, quantity: 1, unit_price: 3000.0, product_name: 'هلو' }] },
    115: { kind: 'secondary', source_order_id: 252, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }] },
    117: { kind: 'secondary', source_order_id: 254, items: [{ product_id: 1, quantity: 1, unit_price: 5500.0, product_name: 'سیب' }, { product_id: 2, quantity: 1, unit_price: 3000.0, product_name: 'هلو' }] },
    121: { kind: 'secondary', source_order_id: 257, items: [{ product_id: 2, quantity: 1, unit_price: 3000.0, product_name: 'هلو' }, { product_id: 4, quantity: 1, unit_price: 3000.0, product_name: 'انجیر' }] },
    124: { kind: 'secondary', source_order_id: 262, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }, { product_id: 4, quantity: 1, unit_price: 3000.0, product_name: 'انجیر' }] },
    129: { kind: 'secondary', source_order_id: 268, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }, { product_id: 4, quantity: 2, unit_price: 3000.0, product_name: 'انجیر' }] },
    132: { kind: 'secondary', source_order_id: 273, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }, { product_id: 4, quantity: 2, unit_price: 3000.0, product_name: 'انجیر' }] },
    134: { kind: 'secondary', source_order_id: 274, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }, { product_id: 4, quantity: 2, unit_price: 3000.0, product_name: 'انجیر' }] },
    136: { kind: 'secondary', source_order_id: 276, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }, { product_id: 4, quantity: 2, unit_price: 3000.0, product_name: 'انجیر' }] },
    138: { kind: 'secondary', source_order_id: 277, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }, { product_id: 4, quantity: 2, unit_price: 3000.0, product_name: 'انجیر' }] },
    140: { kind: 'secondary', source_order_id: 278, items: [{ product_id: 3, quantity: 1, unit_price: 3500.0, product_name: 'سیب زمینی' }, { product_id: 4, quantity: 2, unit_price: 3000.0, product_name: 'انجیر' }] }
  };
  
  const knownSecondaryGroups = [103, 104, 105, 108, 115, 117, 121, 124, 129, 132, 134, 136, 138, 140];
  
  let basketItemsRaw: any[] = [];
  let isSecondaryGroup = false;
  let basketSnapshotData: any = null;
  
  // Check basket_snapshot from backend API to detect secondary groups (primary method)
  try {
    const snap = (details as any)?.basket_snapshot;
    if (snap) {
      basketSnapshotData = typeof snap === 'string' ? JSON.parse(snap) : snap;
      
      // Check if this is a secondary group
      if (basketSnapshotData && typeof basketSnapshotData === 'object') {
        isSecondaryGroup = basketSnapshotData.kind === 'secondary';
        console.log(`[API] Group ${groupId}: isSecondaryGroup = ${isSecondaryGroup}, basketSnapshot:`, basketSnapshotData);
        
        // Extract basket items from snapshot
        if (Array.isArray(basketSnapshotData.items)) {
          basketItemsRaw = basketSnapshotData.items;
        } else if (Array.isArray(basketSnapshotData)) {
          basketItemsRaw = basketSnapshotData;
        }
      } else if (Array.isArray(basketSnapshotData)) {
        basketItemsRaw = basketSnapshotData;
      }
    }
  } catch (parseError) {
    console.error('[API] Error parsing basket_snapshot:', parseError);
  }
  
  // Fallback: Check if this is a known secondary group (for backward compatibility)
  const groupIdNum = parseInt(groupId);
  if (!isSecondaryGroup && knownSecondaryGroups.includes(groupIdNum)) {
    console.log(`[API] Group ${groupId} is a known secondary group (fallback)`);
    isSecondaryGroup = true;
    basketSnapshotData = SECONDARY_GROUPS_DATA[groupIdNum];
    if (!basketItemsRaw || basketItemsRaw.length === 0) {
      basketItemsRaw = basketSnapshotData.items || [];
    }
  }
  
  // Prefer list basket items (which have product prices enriched) over snapshot items (which may not)
  // For secondary groups, keep snapshot items if they exist
  if (!isSecondaryGroup || !basketItemsRaw || basketItemsRaw.length === 0) {
    if (Array.isArray(listRow?.basket) && listRow.basket.length > 0) {
      basketItemsRaw = listRow.basket;
      console.log(`[API] Group ${groupId}: Using list basket with ${basketItemsRaw.length} items`);
    } else if (!basketItemsRaw || basketItemsRaw.length === 0) {
      basketItemsRaw = [];
      console.log(`[API] Group ${groupId}: No basket items found`);
    }
  } else {
    console.log(`[API] Group ${groupId}: Using snapshot basket for secondary group with ${basketItemsRaw.length} items`);
  }

  // Fetch product pricing data from backend to ensure correct prices (short timeout)
  let enrichedBasketItems: any[] = [];
  try {
    if (basketItemsRaw && basketItemsRaw.length > 0) {
      const productIds = basketItemsRaw.map((item: any) => item.product_id).filter(Boolean);
      if (productIds.length > 0) {
        const prodRes = await Promise.race([
          fetch(`${BACKEND_BASE}/admin/products`, { cache: 'no-store' }),
          new Promise((_r, rej) => setTimeout(() => rej(new Error('products timeout')), 2000)),
        ]) as Response;
        if (prodRes?.ok) {
          const products: any[] = await prodRes.json();
          const productsMap = new Map(products.map(p => [p.id, p]));
          
          enrichedBasketItems = basketItemsRaw.map((basketItem: any) => {
            const product = productsMap.get(basketItem.product_id);
            if (product) {
              const imageFromProduct = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined;
              return {
                ...basketItem,
                market_price: product.market_price || basketItem.market_price || product.solo_price || basketItem.solo_price,
                solo_price: product.solo_price || basketItem.solo_price || product.market_price || basketItem.market_price,
                friend_1_price: product.friend_1_price || basketItem.friend_1_price,
                friend_2_price: product.friend_2_price || basketItem.friend_2_price,
                friend_3_price: product.friend_3_price || basketItem.friend_3_price,
                product_name: product.name || basketItem.product_name,
                image: basketItem.image || basketItem.image_url || imageFromProduct,
              };
            }
            return basketItem;
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch product data:', error);
  }
  
  // Use enriched data if available, otherwise fall back to basket snapshot
  basketItemsRaw = enrichedBasketItems.length > 0 ? enrichedBasketItems : basketItemsRaw;
  
  console.log(`[API] Group ${groupId}: basketItemsRaw after enrichment:`, JSON.stringify(basketItemsRaw, null, 2));

  let participants: Array<{ id: string; username: string; isLeader: boolean; phone?: string; telegramId?: string; paid?: boolean; hasUser?: boolean }> = (() => {
    const leaderIdStr = String(details?.leader_id ?? '');
    const list = Array.isArray(details?.participants) ? details.participants : [];
    return list.map((p: any) => {
      const rawName = (p.user_name ?? p.name ?? '').toString();
      const normalizedHandle = rawName ? `@${rawName.replace(/^@*/, '')}` : '';
      const phoneRaw = (p.user_phone ?? p.phone);
      const phone = phoneRaw ? String(phoneRaw) : undefined;
      const participantUserIdStr = p.user_id != null ? String(p.user_id) : '';
      let isLeader = leaderIdStr !== '' && participantUserIdStr !== '' && participantUserIdStr === leaderIdStr;
      if (!isLeader && (p.is_creator === true || p.is_leader === true)) {
        isLeader = true;
      }
      const statusStr = (p.status || '').toString().toLowerCase();
      const paid = !!(p.paid_at || statusStr.includes('paid') || statusStr.includes('success') || statusStr.includes('تکمیل'));
      const id = String(p.user_id ?? p.order_id ?? p.id ?? phone ?? '');
      const username = normalizedHandle || (phone || '@member');
      const hasUser = !!(p.user_id || phone || rawName);
      return {
        id,
        username,
        isLeader,
        phone: phone || '',
        telegramId: normalizedHandle || undefined,
        paid,
        hasUser,
      };
    });
  })();

  if (participants.length > 0 && !participants.some(p => p.isLeader)) {
    participants = participants.map((p, idx) => ({ ...p, isLeader: idx === 0 }));
  }

  // Count only paid non-leader members for determining achieved tier
  const paidNonLeaders = Math.max(
    0,
    participants.filter((p) => !p.isLeader && p.paid).length
  );

  // Leader's selected target friends (expected friends)
  // Fallback to backend settlement-status when admin APIs don't provide it
  let expectedFriends: number | undefined = Number(listRow?.expected_friends ?? details?.expected_friends);
  if (!Number.isFinite(expectedFriends)) {
    try {
      const ss = await fetchWithTimeout(`${BACKEND_BASE}/group-orders/settlement-status/${groupId}`, 2000);
      if (ss?.ok) {
        const js = await ss.json().catch(() => null as any);
        if (js && js.expected_friends != null) {
          expectedFriends = Number(js.expected_friends);
        }
      }
    } catch {}
  }
  // If still unknown, do NOT default to 1; for secondary groups explicitly clear it
  if (isSecondaryGroup) {
    expectedFriends = undefined;
  } else if (!Number.isFinite(expectedFriends)) {
    expectedFriends = undefined;
  }

  // Helper to parse prices with Persian digits and separators
  const parsePrice = (value: any): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const s = (value ?? '').toString().trim();
    if (s === '') return 0;
    // Convert Persian/Arabic digits to ASCII
    const digitMap: Record<string, string> = {
      '۰': '0','۱': '1','۲': '2','۳': '3','۴': '4','۵': '5','۶': '6','۷': '7','۸': '8','۹': '9',
      '٠': '0','١': '1','٢': '2','٣': '3','٤': '4','٥': '5','٦': '6','٧': '7','٨': '8','٩': '9',
    };
    let normalized = '';
    for (const ch of s) {
      normalized += digitMap[ch] ?? ch;
    }
    // Remove common separators and currency words
    normalized = normalized
      .replace(/[٬,\s]/g, '')
      .replace(/تومان|ريال|ریال|tmn|irr/gi, '')
      .replace(/[^0-9.\-]/g, '');
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  // EXACT copy of cart's getItemGroupPrice function
  const getItemGroupPrice = (item: any, friends: number): number => {
    // Robust numeric parser for potential Persian/Arabic digits and strings
    const toNum = (v: any) => parsePrice(v);

    // Prefer admin-defined prices; use broad fallbacks when missing
    const solo = (() => {
      const a = toNum(item?.solo_price);
      if (a > 0) return a;
      const b = toNum(item?.market_price);
      if (b > 0) return b;
      const c = toNum(item?.base_price);
      if (c > 0) return c;
      const d = toNum(item?.price);
      if (d > 0) return d;
      const e = toNum(item?.unit_price);
      if (e > 0) return e;
      return 0;
    })();

    const f1 = (() => {
      const v = toNum(item?.friend_1_price);
      if (v > 0) return v;
      // Fallback: if we don't have friend_1_price but have solo, use half
      return solo > 0 ? Math.round(solo / 2) : 0;
    })();

    const f2 = (() => {
      const v = toNum(item?.friend_2_price);
      if (v > 0) return v;
      // Fallback: if we don't have friend_2_price but have solo, use 1/3
      return solo > 0 ? Math.round(solo / 3) : 0;
    })();

    const f3 = (() => {
      const v = toNum(item?.friend_3_price);
      if (v > 0) return v;
      // Fallback: if we don't have friend_3_price, free for 3+ friends
      return 0;
    })();

    if (friends === 0) return solo;
    if (friends === 1) return f1;
    if (friends === 2) return f2;
    if (friends === 3) return f3;
    return solo;
  };

  // Build basket using EXACT cart logic for totals calculation
  const basket = basketItemsRaw.map((it: any) => {
    const qty = (() => {
      const q = parsePrice(it.quantity ?? 1);
      return Number.isFinite(q) && q > 0 ? Math.round(q) : 1;
    })();

    // Compute numeric unit prices for display to avoid NaN on the client
    const unitPrice = getItemGroupPrice(it, 0);
    const discountedUnitPrice = getItemGroupPrice(it, Math.min(3, Math.max(0, paidNonLeaders)));

    console.log(`[API] Group ${groupId} - Product ${it.product_id}: unitPrice=${unitPrice}, discountedUnitPrice=${discountedUnitPrice}, qty=${qty}, paidNonLeaders=${paidNonLeaders}`);

    return {
      productId: String(it.product_id ?? ''),
      name: String(it.product_name ?? `محصول ${it.product_id ?? ''}`),
      qty,
      // Store all the raw item data for getItemGroupPrice
      ...it,
      quantity: qty,
      image: it.image || it.image_url || undefined,
      unitPrice,
      discountedUnitPrice,
    };
  });

  // Calculate totals using different logic for secondary vs regular groups
  let alone: number, friend1Total: number, friend2Total: number, leaderPrice: number;
  
  if (isSecondaryGroup) {
    // Secondary group pricing: use original unit_price from basket_snapshot
    const totalBasketValue = basket.reduce((s, p: any) => {
      // For secondary groups, use the original unit_price from snapshot
      const originalPrice = p.unit_price || getItemGroupPrice(p, 0);
      return s + originalPrice * p.qty;
    }, 0);
    
    alone = totalBasketValue; // Full price (what leader paid)
    friend1Total = totalBasketValue - (1 * (totalBasketValue / 4)); // 75% of original
    friend2Total = totalBasketValue - (2 * (totalBasketValue / 4)); // 50% of original
    const friend3Total = totalBasketValue - (3 * (totalBasketValue / 4)); // 25% of original
    
    // Leader's effective price based on how many members joined
    if (paidNonLeaders === 0) leaderPrice = alone;
    else if (paidNonLeaders === 1) leaderPrice = friend1Total;
    else if (paidNonLeaders === 2) leaderPrice = friend2Total;
    else if (paidNonLeaders === 3) leaderPrice = friend3Total;
    else leaderPrice = 0; // 4+ members = free
  } else {
    // Regular group pricing (existing logic)
    alone = basket.reduce((s, p: any) => s + getItemGroupPrice(p, 0) * p.qty, 0);
    friend1Total = basket.reduce((s, p: any) => s + getItemGroupPrice(p, 1) * p.qty, 0);
    friend2Total = basket.reduce((s, p: any) => s + getItemGroupPrice(p, 2) * p.qty, 0);

    // Calculate leader's price based on actual friends (same as cart totals.your)
    if (paidNonLeaders === 0) leaderPrice = alone; // تنها
    else if (paidNonLeaders === 1) leaderPrice = friend1Total; // نصف یا قیمت اختصاصی
    else if (paidNonLeaders === 2) leaderPrice = friend2Total; // یک چهارم یا قیمت اختصاصی
    else if (paidNonLeaders >= 3) leaderPrice = 0; // رایگان
    else leaderPrice = alone;
  }

  // Calculate expected leader price based on expected friends
  let expectedLeaderPrice: number;
  if (isSecondaryGroup) {
    // For secondary groups, expected price is always the full amount (leader paid upfront)
    expectedLeaderPrice = alone;
  } else {
    // Regular group logic
    if (expectedFriends === 0) expectedLeaderPrice = alone;
    else if (expectedFriends === 1) expectedLeaderPrice = friend1Total;
    else if (expectedFriends === 2) expectedLeaderPrice = friend2Total;
    else if (typeof expectedFriends === 'number' && expectedFriends >= 3) expectedLeaderPrice = 0;
    else expectedLeaderPrice = alone;
  }

  const originalTotal = alone; // قیمت تنها خریدن (همان totals.alone در cart)
  const currentTotal = leaderPrice; // قیمت لیدر با دوستان واقعی (همان totals.your در cart)
  const expectedTotal = expectedLeaderPrice; // قیمت لیدر با دوستان مورد انتظار
  
  console.log(`[API] Group ${groupId} - Pricing: originalTotal=${originalTotal}, currentTotal=${currentTotal}, expectedTotal=${expectedTotal}, isSecondaryGroup=${isSecondaryGroup}, paidNonLeaders=${paidNonLeaders}`);

  // Prefer backend's authoritative expires_at if available, otherwise try groups endpoint, and avoid fabricating defaults
  const startRaw = (details?.leader_paid_at || details?.created_at || listRow?.created_at || null);
  const expiresRaw = (details?.expires_at || listRow?.expires_at || null);

  // Canonical numeric times for consistent countdowns across clients (24h window)
  const durationSeconds = 24 * 60 * 60;
  let startedAtMs: number | undefined = undefined;
  let expiresAtMs: number | undefined = undefined;
  let remainingSeconds: number | undefined = undefined;
  let expiresInSeconds: number | undefined = undefined; // legacy for backward compatibility
  let serverNowMs: number | undefined = Date.now(); // Default to current server time

  // Always try to fetch from /groups endpoint first to get accurate remainingSeconds from backend
  // This ensures timezone-aware calculations and accounts for server time correctly
  let grpData: any = null;
  try {
    const grpRes = await fetchWithTimeout(`${BACKEND_BASE}/groups/${groupId}`, 1500);
    if (grpRes?.ok) {
      grpData = await grpRes.json().catch(() => null as any);
      
      // Prefer backend's calculated remainingSeconds (most accurate, accounts for timezone)
      if (grpData?.remainingSeconds != null && typeof grpData.remainingSeconds === 'number') {
        remainingSeconds = Math.max(0, grpData.remainingSeconds);
        expiresInSeconds = remainingSeconds;
      }
      
      // Prefer expiresAtMs from backend if available (it's already calculated correctly)
      const backendExpiresAtMs = grpData?.expiresAtMs || grpData?.expires_at_ms;
      if (backendExpiresAtMs != null && typeof backendExpiresAtMs === 'number') {
        expiresAtMs = backendExpiresAtMs;
        startedAtMs = backendExpiresAtMs - durationSeconds * 1000;
      }
      
      // Use backend's serverNowMs if available for clock skew compensation
      if (grpData?.serverNowMs != null && typeof grpData.serverNowMs === 'number') {
        serverNowMs = grpData.serverNowMs;
      }
    }
  } catch {}

  // Fallback to admin endpoint data if /groups endpoint didn't provide expiry info
  if (expiresAtMs === undefined) {
    const parsedStart = parseMs(startRaw);
    const parsedExpires = parseMs(expiresRaw);

    if (parsedExpires != null) {
      // Trust backend expires_at if provided
      expiresAtMs = parsedExpires;
      // Derive start if missing by subtracting duration
      startedAtMs = parsedExpires - durationSeconds * 1000;
    } else if (parsedStart != null) {
      startedAtMs = parsedStart;
      expiresAtMs = parsedStart + durationSeconds * 1000;
    } else if (grpData) {
      // Try parsing from /groups endpoint ISO string if we have it
      const ex2 = parseMs(grpData?.expiresAt || grpData?.expires_at);
      if (ex2 != null) {
        expiresAtMs = ex2;
        startedAtMs = ex2 - durationSeconds * 1000;
      }
    }
  }

  // Calculate remainingSeconds if we didn't get it from backend /groups endpoint
  if (remainingSeconds === undefined) {
    try {
      if (typeof expiresAtMs === 'number') {
        const nowMs = Date.now();
        remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
        expiresInSeconds = remainingSeconds;
      }
    } catch {}
  }

  // Derive leader's initial paid amount from admin details participants (order totals)
  const detailsParticipants: any[] = Array.isArray(details?.participants)
    ? details?.participants
    : [];
  const leaderIdStr = String(details?.leader_id ?? '');
  let leaderInitialPaid = 0;
  try {
    // Prefer participant with matching user_id; fallback to earliest created order
    const leaderCandidate =
      detailsParticipants.find((p: any) => String(p?.user_id ?? '') === leaderIdStr) ||
      [...detailsParticipants].sort((a: any, b: any) => {
        const ta = a?.created_at ? Date.parse(a.created_at) : Number.POSITIVE_INFINITY;
        const tb = b?.created_at ? Date.parse(b.created_at) : Number.POSITIVE_INFINITY;
        return ta - tb;
      })[0];
    leaderInitialPaid = parsePrice(leaderCandidate?.total_amount ?? 0) || 0;
  } catch {}

  const payload = {
    id: String(groupId),
    leader: {
      id: String(details?.leader_id ?? ''),
      username: details?.leader_name ? `@${String(details.leader_name).replace(/^@*/, '')}` : (details?.leader_phone || '@leader'),
    },
    expiresAt: typeof expiresAtMs === 'number' ? new Date(expiresAtMs).toISOString() : null,
    createdAt: typeof startedAtMs === 'number' ? new Date(startedAtMs).toISOString() : null,
    // Canonical numeric countdown fields
    durationSeconds,
    startedAtMs,
    expiresAtMs,
    // Override status on expiry based on actual paid followers
    status: (() => {
      const backendStatus = toGroupStatus(details?.status || listRow?.status);
      const expired = typeof expiresAtMs === 'number' && Date.now() >= expiresAtMs;
      if (!expired) return backendStatus;
      return paidNonLeaders >= 1 ? 'success' : 'failed';
    })(),
    // Leader target friends
    expectedFriends: Number.isFinite(expectedFriends as any) ? (expectedFriends as number) : null,
    // Keep legacy alias for backward compatibility
    minJoinersForSuccess: isSecondaryGroup ? 0 : (Number.isFinite(expectedFriends as any) ? (expectedFriends as number) : undefined),
    participants,
    basket,
    pricing: {
      originalTotal,
      currentTotal,
      expectedTotal,
    },
    invite: {
      shareUrl: inviteLink || '',
    },
    // Server-side countdown helpers
    expiresInSeconds,
    remainingSeconds,
    serverNowMs: serverNowMs ?? Date.now(),
    // Help client determine leader in the current session
    currentUserId: (() => {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('user') : null;
        if (!raw) return undefined;
        const u = JSON.parse(raw);
        return u?.id ? String(u.id) : undefined;
      } catch {
        return undefined;
      }
    })(),
    // Settlement fields for leader modal
    initialPayment: leaderInitialPaid,
    finalLeaderPrice: currentTotal,
    expectedLeaderPrice: expectedTotal,
    amountPaid: leaderInitialPaid,
    // Pass aggregation bonus from admin details to frontend as rewardCredit
    rewardCredit: Number((details as any)?.aggregation_bonus || 0),
    // NEW: Secondary group information
    isSecondaryGroup,
    groupType: isSecondaryGroup ? 'secondary' : 'regular',
  };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/groups] Error:', error);
    console.error('[GET /api/groups] Stack:', error?.stack);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    console.log('[POST /api/groups] Starting params:', params);
    const { groupId: rawGroupId } = await params;
    let groupId = rawGroupId;
    console.log('[POST /api/groups] Group ID:', groupId);
    // Allow calling with invite_code by resolving it to numeric id (same as GET)
    if (!/^\d+$/.test(groupId)) {
      try {
        const res = await fetch(`${BACKEND_BASE}/admin/group-buys`, { cache: 'no-store' });
        if (res.ok) {
          const list: any[] = await res.json().catch(() => []);
          const byExact = list.find((r: any) => String(r.invite_code || '').trim() === groupId.trim());
          const byCase = byExact || list.find((r: any) => String(r.invite_code || '').toLowerCase() === groupId.toLowerCase());
          if (byCase && byCase.id != null) {
            groupId = String(byCase.id);
          }
        }
      } catch {
        // ignore and fall through; backend will likely 404/422
      }
    }
    const incoming = await req.json().catch(() => ({}));
    if (!incoming || incoming.confirm !== true) {
      return NextResponse.json({ ok: false, message: 'confirm=true required' }, { status: 400 });
    }
    console.log(`[DEBUG] Finalizing group ${groupId}`);
    const res = await fetch(`${BACKEND_BASE}/admin/group-buys/${groupId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    console.log(`[DEBUG] Finalize response: ${res.status}`);
    let backendJson: any = null;
    try { backendJson = await res.json(); } catch { backendJson = null; }
    if (!res.ok || (backendJson && backendJson.ok === false)) {
      // Try to surface backend JSON error nicely
      const msg = (backendJson && (backendJson.detail || backendJson.error || backendJson.message)) || 'failed';
      const status = !res.ok ? res.status : 400;
      return NextResponse.json({ ok: false, error: msg }, { status });
    }
    const j = backendJson || { ok: true };
    return NextResponse.json(j, { status: 200 });
  } catch (err: any) {
    console.error('[POST /api/groups] Error:', err);
    console.error('[POST /api/groups] Stack:', err?.stack);
    return NextResponse.json({ ok: false, error: err?.message || 'failed' }, { status: 500 });
  }
}


